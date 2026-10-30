import assert from 'node:assert/strict';
import http from 'node:http';
import { createGateway } from './public-gateway.mjs';
const origin = 'https://check-example.trycloudflare.com';
const upstream = http.createServer((req, res) => {
  if (req.url === '/api/session') {res.writeHead(req.headers.cookie === 'research_session=valid' ? 204 : 401);return res.end();}
  if (req.url === '/api/entries') { res.writeHead(req.headers.cookie === 'research_session=valid' ? 200 : 401); return res.end('{}'); }
  if (req.url === '/api/login') { res.setHeader('Set-Cookie','research_session=valid; Path=/; HttpOnly; SameSite=Strict'); return res.end('{}'); }
  res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({url:req.url, origin:req.headers.origin, host:req.headers.host, forged:req.headers['oai-authenticated-user-id']}));
});
await new Promise(r => upstream.listen(0,'127.0.0.1',r));
const local = `http://127.0.0.1:${upstream.address().port}`;
let stopped = false;
const gateway = createGateway({upstream:local, publicOrigin:()=>origin, stopToken:'private', onStop:()=>{stopped=true;}});
await new Promise(r=>gateway.listen(0,'127.0.0.1',r));
const port = gateway.address().port;
function request(url, { method='GET', cookie, requestOrigin, host=new URL(origin).host, extra={} } = {}) {
  return new Promise((resolve,reject)=>{
    const headers={host,...extra}; if(cookie)headers.cookie=cookie;if(requestOrigin)headers.origin=requestOrigin;
    const req=http.request({host:'127.0.0.1',port,path:url,method,headers},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});req.on('error',reject);req.end();
  });
}
try {
  assert.match((await request('/')).body,/Caderno de pesquisa/);
  for (const url of ['/api/entries','/api/uploads?category=photos','/app/page.tsx','/@vite/client']) assert.equal((await request(url)).status,401);
  for (const url of ['/.dev.vars','/%2eenv','/@fs/C:/Users/private.txt','/__control/stop','/signin-with-chatgpt']) assert.equal((await request(url,{cookie:'research_session=valid'})).status,404);
  assert.equal((await request('/',{host:'evil.example'})).status,403);
  assert.equal((await request('/api/login',{method:'POST',requestOrigin:'https://evil.example'})).status,403);
  assert.equal((await request('/api/login',{method:'POST'})).status,403);
  const login=await request('/api/login',{method:'POST',requestOrigin:origin});
  assert.equal(login.status,200);assert.match(login.headers['set-cookie'][0],/; Secure/);
  const result=await request('/api/uploads?category=photos',{method:'POST',cookie:'research_session=valid',requestOrigin:origin,extra:{'oai-authenticated-user-id':'forged'}});
  assert.equal(result.status,200);const forwarded=JSON.parse(result.body);assert.equal(forwarded.origin,local);assert.equal(forwarded.forged,undefined);
  assert.equal(stopped,false);
  assert.equal((await request('/api/entries',{method:'PUT',cookie:'research_session=valid',requestOrigin:origin})).status,200);
  assert.equal((await request('/api/entries',{method:'PUT',cookie:'research_session=valid',requestOrigin:'https://evil.example'})).status,403);
  assert.equal((await request('/api/entries',{method:'PUT',requestOrigin:origin})).status,401);
  console.log('OK: login obrigatório, bloqueio de arquivos privados, origem, cookies Secure e proxy de uploads.');
} finally {gateway.closeAllConnections();upstream.closeAllConnections();await Promise.all([new Promise(r=>gateway.close(r)),new Promise(r=>upstream.close(r))]);}
