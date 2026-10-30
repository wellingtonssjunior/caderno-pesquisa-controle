import './sites-env.mjs';
import { Miniflare } from 'miniflare';
import { createServer } from 'node:http';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { initializeUploads, uploadHandler } from '../build/local-uploads.mjs';

// Only rebuild when application inputs changed. Credentials and data never enter the build hash.
const inputs = ['vite.config.ts','package-lock.json'];
for (const dir of ['app','components','lib','hooks','build','public']) {
  for (const file of await readdir(dir,{recursive:true,withFileTypes:true})) {
    if(file.isFile()) inputs.push(path.join(file.parentPath ?? file.path,file.name));
  }
}
const hash=createHash('sha256');
for(const file of inputs.sort()){hash.update(file);hash.update(await readFile(file));}
const signature=hash.digest('hex'), marker='.sites-runtime/production-signature';
let previous='';try{previous=await readFile(marker,'utf8');await readFile('dist/server/index.js');}catch{previous='';}
if(previous!==signature){
  console.log('Preparando a versão otimizada do caderno (somente após alterações)...');
  const result=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','scripts/run-framework.mjs','build'],{stdio:'inherit',windowsHide:true});
  if(result.status!==0)throw new Error('A compilação falhou. Nenhum dado foi alterado.');
  await writeFile(marker,signature);
}
const config=JSON.parse(await readFile('dist/server/wrangler.json','utf8'));
const moduleFiles=(await readdir('dist/server',{recursive:true})).filter(f=>/\.m?js$/.test(f) && f!=='index.js');
const mf=new Miniflare({
  modules:['index.js',...moduleFiles].map(f=>({type:'ESModule',path:path.resolve('dist/server',f)})),modulesRoot:path.resolve('dist/server'),
  compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,
  bindings:parseEnv(await readFile('.dev.vars','utf8')),
  d1Databases:Object.fromEntries(config.d1_databases.map(d=>[d.binding,d.database_id])),
  d1Persist:path.resolve('.wrangler/state/v3/d1'),
  assets:{directory:path.resolve('dist/client'),routerConfig:{has_user_worker:true}},
});
await mf.ready;
await initializeUploads();
const port=Number(process.env.CADERNO_PORT||5173);
const base=`http://127.0.0.1:${port}`;
const uploads=uploadHandler({authorize:async req=>{
  const result=await mf.dispatchFetch(base+'/api/session',{headers:{cookie:req.headers.cookie||''}});
  return result.status===204;
}});
const server=createServer((req,res)=>void uploads(req,res,async()=>{
  try{
    if(!['127.0.0.1','localhost'].includes(new URL(`http://${req.headers.host}`).hostname)){res.writeHead(403);res.end();return;}
    const chunks=[];let size=0;
    for await(const chunk of req){size+=chunk.length;if(size>1024*1024){res.writeHead(413);res.end();return;}chunks.push(chunk);}
    const headers={...req.headers};delete headers.connection;delete headers['transfer-encoding'];delete headers['content-length'];headers['accept-encoding']='identity';
    const response=await mf.dispatchFetch(new URL(req.url,base),{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
    const outgoing=Object.fromEntries(response.headers);delete outgoing['content-length'];delete outgoing['transfer-encoding'];delete outgoing['content-encoding'];
    const cookies=response.headers.getSetCookie();if(cookies.length)outgoing['set-cookie']=cookies;
    outgoing['x-caderno-runtime']='production';
    let bytes=Buffer.from(await response.arrayBuffer());
    if(/\bgzip\b/.test(req.headers['accept-encoding']||'')&&bytes.length>1024&&/text|javascript|json|svg/.test(outgoing['content-type']||'')){
      bytes=gzipSync(bytes);outgoing['content-encoding']='gzip';outgoing.vary=[outgoing.vary,'Accept-Encoding'].filter(Boolean).join(', ');
    }
    if(req.url.startsWith('/_next/static/'))outgoing['cache-control']='private, max-age=31536000, immutable';
    res.writeHead(response.status,outgoing);res.end(req.method==='HEAD'?undefined:bytes);
  }catch(error){console.error(error.message);if(!res.headersSent){res.writeHead(503);res.end('Servidor indisponível. Tente novamente.');}else res.destroy();}
}));
server.on('error',async error=>{console.error(error.message);await mf.dispose();process.exit(1);});
server.listen(port,'127.0.0.1',()=>console.log(`Caderno otimizado pronto: ${base}`));
async function stop(){server.closeAllConnections();server.close();await mf.dispose();process.exit(0);}
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
