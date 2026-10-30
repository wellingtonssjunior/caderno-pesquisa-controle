// Verify the actual local app using a short-lived test session; never print data or credentials.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import http from 'node:http';
import { createGateway } from './public-gateway.mjs';
import './sites-env.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const vars = await readFile('.dev.vars','utf8');
const raw = vars.match(/^RESEARCH_PASSWORD_HASH\s*=\s*(.+)$/m)?.[1]?.trim();
assert.ok(raw, 'Configuração de autenticação necessária.');
const credential = raw.replace(/^['"]|['"]$/g, '');
const folder = '.wrangler/state/v3/d1/';
let db;
for (const file of await readdir(folder,{recursive:true})) {
  if (!file.endsWith('.sqlite')) continue;
  const candidate = new DatabaseSync(folder + file);
  if (candidate.prepare("SELECT name FROM sqlite_master WHERE name='auth_sessions'").get()) {db=candidate;break;}
  candidate.close();
}
assert.ok(db,'Banco local não encontrado.');
const token=randomBytes(32).toString('hex'), id=hash(token);
const origin='https://integration-test.trycloudflare.com';
const gateway=createGateway({publicOrigin:()=>origin,upstream:process.env.CADERNO_TEST_UPSTREAM||'http://127.0.0.1:5173'});
try {
  db.prepare('INSERT INTO auth_sessions(id,expires_at,credential_version) VALUES(?,?,?)').run(id,Date.now()+120000,hash(credential));
  await new Promise(r=>gateway.listen(0,'127.0.0.1',r));
  const external = process.argv[2];
  const request = external ? async url => { const response=await fetch(new URL(url,external),{headers:{cookie:`research_session=${token}`},signal:AbortSignal.timeout(30000)});return {status:response.status,body:await response.text()}; } : url => new Promise((resolve,reject)=>{
    const req=http.request({hostname:'127.0.0.1',port:gateway.address().port,path:url,headers:{host:new URL(origin).host,cookie:`research_session=${token}`}},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,body}));});req.on('error',reject);req.end();
  });
  for (const url of ['/api/entries','/api/uploads?category=photos','/']) {
    const result=await request(url);assert.equal(result.status,200,url);console.log(`OK: sessão autenticada ${url}`);
    if(url==='/') {
      const scripts=[...result.body.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&')).filter(src=>src.startsWith('/'));
      assert.ok(scripts.length,'Página precisa de scripts.');
      for(const src of scripts) assert.equal((await request(src)).status,200,'Script de interface');
      console.log(`OK: ${scripts.length} scripts da página acessíveis após login.`);
      const modules=[...result.body.matchAll(/(?:from\s*|import\s*\(?)["'](\/[^"']+)["']/g)].map(m=>m[1]);
      const queue=[...new Set([...scripts,...modules])], visited=new Set();
      while(queue.length && visited.size<(external ? 8 : 150)) {
        const src=queue.shift();if(visited.has(src))continue;visited.add(src);
        const module=await request(src);assert.equal(module.status,200,`Módulo ${src}`);
        for(const match of module.body.matchAll(/(?:from\s*|import\s*\(?)["'](\/[^"']+)["']/g))if(!visited.has(match[1]))queue.push(match[1]);
      }
      console.log(`OK: ${visited.size} módulos da interface verificados.`);
    }
  }
} finally {
  db.prepare('DELETE FROM auth_sessions WHERE id=?').run(id);db.close();
  gateway.closeAllConnections();await new Promise(r=>gateway.close(r));
}
