import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dependencyRoot = fileURLToPath(new URL('../node_modules/', import.meta.url)).replaceAll('\\', '/').toLowerCase();
const loginPage = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Entrar no caderno</title><style>body{margin:0;background:#f1f5f9;color:#172033;font:16px system-ui;display:grid;min-height:100dvh;place-items:center}form{background:white;padding:32px;border-radius:18px;width:min(340px,75vw);box-shadow:0 12px 40px #17203318}h1{font-size:24px}label{display:block;margin:18px 0 6px}input,button{box-sizing:border-box;width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}button{margin-top:24px;background:#164e63;color:white;cursor:pointer}#message{color:#b91c1c}</style><form><h1>Caderno de pesquisa</h1><p>Entre com seu usuário e senha do caderno.</p><label for="username">Usuário</label><input id="username" autocomplete="username" required><label for="password">Senha</label><input id="password" type="password" autocomplete="current-password" required><button>Entrar</button><p id="message" role="alert"></p></form><script>document.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=document.querySelector('button');b.disabled=true;try{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.querySelector('#username').value,password:document.querySelector('#password').value})});const v=await r.json();if(r.ok)location.replace('/');else document.querySelector('#message').textContent=v.error||'Não foi possível entrar.'}catch{document.querySelector('#message').textContent='Conexão interrompida. Tente novamente.'}finally{b.disabled=false}};</script></html>`;

export function createGateway({ upstream = 'http://127.0.0.1:5173', publicOrigin, stopToken, onStop }) {
  const target = new URL(upstream);
  const pendingSessions = new Map();
  function checkSession(cookie) {
    if (!pendingSessions.has(cookie)) {
      const pending = fetch(new URL('/api/session', target), {headers:{cookie},signal:AbortSignal.timeout(10000),redirect:'error'})
        .then(async response => {await response.body?.cancel();return response.status === 204;})
        .finally(()=>pendingSessions.delete(cookie));
      pendingSessions.set(cookie,pending);
    }
    return pendingSessions.get(cookie);
  }
  return http.createServer(async (req, res) => {
    const end = (status, message) => { res.writeHead(status, { 'Content-Type':'text/plain; charset=utf-8', 'Cache-Control':'no-store' }); res.end(message); };
    try {
      // The control endpoint is usable only directly on loopback, never through the tunnel.
      if (req.url === '/__control/stop' && req.method === 'POST' && req.headers.host === '127.0.0.1:5180' && req.headers.authorization === `Bearer ${stopToken}` && stopToken) {
        end(200, 'Acesso público encerrado.'); setImmediate(onStop); return;
      }
      const origin = publicOrigin();
      if (!origin || req.headers.host !== new URL(origin).host) return end(403, 'Endereço não autorizado.');
      if (req.headers['x-forwarded-proto'] === 'http') {
        res.writeHead(308, {Location:origin + '/', 'Cache-Control':'no-store'}); res.end(); return;
      }
      if (!req.url?.startsWith('/') || req.url.startsWith('//')) return end(400, 'Endereço inválido.');
      const url = new URL(req.url, origin);
      const pathname = decodeURIComponent(url.pathname).replaceAll('\\', '/');
      const dependencyPath = pathname.startsWith('/node_modules/') || pathname.toLowerCase().startsWith('/@fs/' + dependencyRoot);
      if (url.origin !== origin || (!dependencyPath && pathname.split('/').some(s => s.startsWith('.'))) || /\/(?:__control|__open-in-editor|__vite|signin-with-chatgpt|signout-with-chatgpt|callback)(?:\/|$)/.test(pathname)) return end(404, 'Não encontrado.');
      if (pathname.startsWith('/@fs/')) {
        const absolute = path.posix.normalize(pathname.slice(5)).toLowerCase();
        if (!absolute.startsWith(dependencyRoot)) return end(404, 'Não encontrado.');
      }
      if (!['GET','HEAD','POST','PUT'].includes(req.method)) return end(405, 'Método não permitido.');
      if ((req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site' || (['POST','PUT'].includes(req.method) && req.headers.origin !== origin)) return end(403, 'Origem inválida.');
      const isLogin = pathname === '/api/login' && req.method === 'POST';
      if (!isLogin) {
        let authorized = false;
        if (req.headers.cookie?.includes('research_session=')) {
          authorized = await checkSession(req.headers.cookie);
        }
        if (!authorized) {
          if (pathname === '/' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store', 'X-Frame-Options':'DENY' }); res.end(loginPage); return;
          }
          return end(401, 'Entre no caderno para continuar.');
        }
      }
      // Rebuild headers rather than trusting visitor-supplied proxy/auth headers.
      const headers = { host:target.host, 'accept-encoding':req.headers['accept-encoding'] || 'identity' };
      for (const name of ['accept','content-type','cookie','content-length','rsc','next-router-state-tree','next-router-prefetch','next-url','range','if-none-match']) {
        if (req.headers[name]) headers[name] = req.headers[name];
      }
      if (req.headers.origin) headers.origin = target.origin;
      if (req.headers['sec-fetch-site']) headers['sec-fetch-site'] = 'same-origin';
      // A single-user notebook uses one shared public login budget. Never let a
      // visitor bypass it by forging Cloudflare headers on another provider.
      headers['cf-connecting-ip'] = 'public-gateway';
      const proxy = http.request(new URL(url.pathname + url.search, target), { method:req.method, headers }, response => {
        const outgoing = { ...response.headers, 'cache-control':pathname.startsWith('/_next/static/') && response.statusCode === 200 ? 'private, max-age=31536000, immutable' : 'no-store', 'x-content-type-options':'nosniff' };
        if (outgoing['set-cookie']) outgoing['set-cookie'] = outgoing['set-cookie'].map(c => /;\s*secure/i.test(c) ? c : c + '; Secure');
        if (outgoing.location?.startsWith(target.origin)) outgoing.location = origin + outgoing.location.slice(target.origin.length);
        res.writeHead(response.statusCode, outgoing); response.pipe(res);
      });
      proxy.on('error', () => { if (!res.headersSent) end(502, 'O servidor local está indisponível.'); else res.destroy(); });
      proxy.setTimeout(120000, () => proxy.destroy());
      req.on('aborted', () => proxy.destroy()); req.pipe(proxy);
    } catch { if (!res.headersSent) end(503, 'Não foi possível acessar o caderno.'); else res.destroy(); }
  });
}
