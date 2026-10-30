import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile, unlink, open } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createGateway } from './public-gateway.mjs';
import './sites-env.mjs';

const runtime = fileURLToPath(new URL('../.sites-runtime/public/', import.meta.url));
const stateFile = runtime + 'state.json';
const addressFile = fileURLToPath(new URL('../../Endereco publico.txt', import.meta.url));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const provider = process.argv.includes('--cloudflare') ? 'cloudflare' : 'localhost.run';
await mkdir(runtime, { recursive:true });
if (process.argv[2] === 'stop') {
  try {
    const state = JSON.parse(await readFile(stateFile, 'utf8'));
    const result = await fetch('http://127.0.0.1:5180/__control/stop', { method:'POST', headers:{authorization:`Bearer ${state.token}`}, signal:AbortSignal.timeout(5000) });
    if (!result.ok) throw new Error('Falha ao encerrar.');
    console.log(await result.text());
  } catch { console.log('Nenhum acesso público ativo foi encontrado.'); }
  process.exit(0);
}
let gateway, local, tunnel, origin = '', stopping = false;
const token = randomBytes(32).toString('hex');
const log = await open(runtime + 'server.log', 'w');
async function stop(code = 0) {
  if (stopping) return; stopping = true;
  gateway?.closeAllConnections(); gateway?.close();
  for (const child of [tunnel, local]) {
    if (child?.pid && child.exitCode === null) spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide:true, stdio:'ignore' });
  }
  await unlink(stateFile).catch(() => {});
  await writeFile(addressFile, 'O acesso publico esta desligado. Execute Iniciar caderno publico.cmd para gerar um novo endereco.\r\n');
  await log.close();
  console.log('\nAcesso público desligado.'); process.exit(code);
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
try {
  gateway = createGateway({ publicOrigin:() => origin, stopToken:token, onStop:() => void stop() });
  await new Promise((resolve, reject) => { gateway.once('error', reject); gateway.listen(5180, '127.0.0.1', resolve); });
  await writeFile(stateFile, JSON.stringify({token}));
  let running = false;
  try { const r = await fetch('http://127.0.0.1:5173/api/entries', {signal:AbortSignal.timeout(30000)}); running = r.status === 401 && r.headers.get('x-caderno-runtime') === 'production'; await r.body?.cancel(); if(!running) throw new Error('Outro servidor usa a porta 5173. Encerre o caderno local antigo e tente novamente.'); } catch(error) { if(error.message.startsWith('Outro servidor'))throw error; }
  if (!running) {
    console.log('Iniciando o caderno local...');
    local = spawn(process.execPath, ['scripts/serve-caderno.mjs'], {windowsHide:true, stdio:['ignore',log.fd,log.fd]});
    local.on('error', error => { console.error(error.message); void stop(1); });
    local.on('exit', () => { if (!stopping) { console.error('Servidor local encerrado. Consulte .sites-runtime/public/server.log.'); void stop(1); } });
    for (let attempt = 0; attempt < 120; attempt++) {
      try { const r = await fetch('http://127.0.0.1:5173/api/entries', {signal:AbortSignal.timeout(3000)}); if (r.status === 401 && (await r.text()).includes('caderno')) { running = true; break; } } catch {}
      await sleep(1000);
    }
    if (!running) throw new Error('O caderno não iniciou. Consulte .sites-runtime/public/server.log.');
  }
  console.log('Conectando à internet. Aguarde o endereço HTTPS...');
  const executable = provider === 'cloudflare' ? runtime + 'cloudflared.exe' : 'C:/Windows/System32/OpenSSH/ssh.exe';
  const args = provider === 'cloudflare'
    ? ['tunnel','--no-autoupdate','--edge-ip-version','4','--protocol','http2','--url','http://127.0.0.1:5180']
    : ['-T','-o','BatchMode=yes','-o','IdentitiesOnly=yes','-o','IdentityFile=none','-o','StrictHostKeyChecking=accept-new','-o',`UserKnownHostsFile=${runtime}known_hosts`,'-o','ConnectTimeout=20','-o','ServerAliveInterval=30','-o','ServerAliveCountMax=3','-o','ExitOnForwardFailure=yes','-R','80:127.0.0.1:5180','nokey@localhost.run','--','--output','json'];
  tunnel = spawn(executable, args, {windowsHide:true, stdio:['ignore','pipe','pipe']});
  tunnel.on('error', error => { console.error(error.message); void stop(1); });
  tunnel.on('exit', () => { if (!stopping) { console.error('Túnel encerrado. Consulte .sites-runtime/public/tunnel.log.'); void stop(1); } });
  let output = '', ready = false;
  const tunnelLog = await open(runtime + 'tunnel.log', 'w');
  const consume = async chunk => {
    await tunnelLog.write(chunk);
    output = (output + chunk.toString()).slice(-20000);
    let registration;
    for (const line of output.split('\n')) {
      try { const event = JSON.parse(line.trim()); if (event.type === 'v1.tcpip_forward.register.accepted') registration = event; } catch {}
    }
    const match = provider === 'cloudflare'
      ? output.match(/https:\/\/([a-z0-9]+-)+[a-z0-9]+\.trycloudflare\.com/)
      : registration?.data?.match(/https:\/\/[a-z0-9-]+\.(?:lhr\.life|localhost\.run|lhr\.rocks)/);
    if (!origin && match) origin = match[0];
    if (origin && !ready && output.includes(provider === 'cloudflare' ? 'Registered tunnel connection' : 'v1.tcpip_forward.register.accepted')) {
      ready = true;
      await writeFile(addressFile, `Caderno de pesquisa\r\n\r\n${origin}\r\n\r\nUse seu usuario e senha do caderno.\r\nEste endereco funciona enquanto o acesso publico estiver ligado.\r\nPara desligar: Encerrar caderno publico.cmd\r\n`);
      console.log(`\nENDEREÇO PÚBLICO: ${origin}\n\nUse seu usuário e senha do caderno.\nO endereço também está em Endereco publico.txt.\nPara desligar, use Encerrar caderno publico.cmd ou Ctrl+C nesta janela.\nMantenha o computador ligado, sem suspensão, e conectado à internet.\n`);
    }
  };
  tunnel.stdout.on('data', chunk => void consume(chunk)); tunnel.stderr.on('data', chunk => void consume(chunk));
  setTimeout(() => { if (!ready && !stopping) { console.error('Não foi possível conectar o túnel em 90 segundos. Verifique a conexão e .sites-runtime/public/tunnel.log.'); void stop(1); } }, 90000).unref();
} catch (error) {
  console.error(error.message);
  // A second launcher must never remove the active launcher's control state.
  if (error.code === 'EADDRINUSE') { console.error('O acesso público já está aberto ou a porta 5180 está ocupada. Consulte Endereco publico.txt.'); process.exit(1); }
  await stop(1);
}
