import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { initializeUploads, uploadHandler } from '../build/local-uploads.mjs';

// Use a separate temporary directory; never create test records in research folders.
const root = await mkdtemp(path.join(tmpdir(), 'caderno-upload-check-'));
let server;
async function start() {
  await initializeUploads(root);
  const handler = uploadHandler({ root, authorize:async req=>req.headers.cookie==='test-session=valid' });
  server = createServer((req,res)=>void handler(req,res,()=>{res.writeHead(404);res.end();}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
async function stop() { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
let base = await start();
const headers = ()=>({ cookie:'test-session=valid', origin:base });
async function upload(category,name,bytes = 'research sample',extraHeaders = {}) {
  const body = new FormData();
  body.append('file',new Blob([bytes]),name);
  body.append('description','Descrição do experimento');body.append('subject','Identificação da planta');
  return fetch(`${base}/api/uploads?category=${category}`,{method:'POST',headers:{...headers(),...extraHeaders},body});
}
try {
  assert.equal((await fetch(`${base}/api/uploads?category=photos`)).status,401);
  assert.equal((await upload('photos','foto.png','test',{origin:'https://outside.example'})).status,403);
  assert.equal((await upload('../outside','foto.png')).status,400);
  assert.equal((await upload('photos','script.exe')).status,400);
  assert.equal((await upload('photos','vazio.png','')).status,400);
  const first = await upload('photos','ensaio.png');assert.equal(first.status,201);
  const record = await first.json();
  const duplicate = await (await upload('photos','ensaio.png','second sample')).json();
  assert.equal(record.name,'ensaio.png');assert.equal(duplicate.name,'ensaio (1).png');
  assert.equal(await readFile(path.join(root,'Fotos experimentais',record.name),'utf8'),'research sample');
  assert.equal(record.description,'Descrição do experimento');assert.equal(record.subject,'Identificação da planta');
  for (const [category,name,folder] of [['references','referência.pdf','Referencias do professor'],['matlab','modelo.m','MATLAB']]) {
    const response = await upload(category,name);assert.equal(response.status,201);
    const item = await response.json();assert.equal(await readFile(path.join(root,folder,item.name),'utf8'),'research sample');
  }
  const download = await fetch(`${base}/api/uploads/${record.id}?category=photos`,{headers:headers()});
  assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/^attachment/);assert.equal(await download.text(),'research sample');
  const preview = await fetch(`${base}/api/uploads/${record.id}?category=photos&preview=1`,{headers:headers()});
  assert.equal(preview.headers.get('content-type'),'image/png');await preview.arrayBuffer();
  assert.equal((await fetch(`${base}/api/uploads/${record.id}?category=matlab`,{headers:headers()})).status,404);
  const oversized = await upload('matlab','big.mat',new Uint8Array(50*1024*1024+1));assert.equal(oversized.status,413);
  await stop();base = await start();
  const listing = await fetch(`${base}/api/uploads?category=photos`,{headers:headers()});
  assert.equal(listing.status,200);assert.equal((await listing.json()).files.length,2);
  console.log('PASS: categorias, gravação em disco, metadados, duplicados, download, prévia, persistência após reinício, autenticação, origem, formatos e limite de tamanho.');
} finally {
  await stop();
  if (path.dirname(root)!==path.resolve(tmpdir()) || !path.basename(root).startsWith('caderno-upload-check-')) throw new Error('Unexpected temporary directory');
  await rm(root,{recursive:true,force:true});
}
