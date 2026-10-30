import { configuration, cookieValue, digest, hex, sameOrigin, verifyPassword } from '@/lib/auth';
import { database } from '@/lib/store';
export async function POST(request:Request) {
 if(!sameOrigin(request))return Response.json({error:'Origem inválida.'},{status:403});
 try {
  const raw=await request.text(); if(raw.length>2048)return Response.json({error:'Dados inválidos.'},{status:400});
  let body; try{body=JSON.parse(raw)}catch{return Response.json({error:'Dados inválidos.'},{status:400})}
  if(typeof body.username!=='string'||typeof body.password!=='string'||body.password.length>256)return Response.json({error:'Dados inválidos.'},{status:400});
  const config=configuration(), now=Date.now();
  const key=await digest('login:'+ (request.headers.get('cf-connecting-ip')||'unknown'));
  // Reserve attempts atomically so simultaneous requests cannot bypass the limit.
  const attempt=await database().prepare('INSERT INTO auth_attempts (id, attempts, reset_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END, reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END RETURNING attempts,reset_at').bind(key,now+900000,now,now,now+900000).first<{attempts:number,reset_at:number}>();
  if(!attempt||attempt.attempts>5)return Response.json({error:'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.'},{status:429,headers:{'Retry-After':'900','Cache-Control':'no-store'}});
  const correct=await verifyPassword(body.password,config.hash);
  if(!correct||body.username.trim().toLowerCase()!==config.username.toLowerCase())return Response.json({error:'Usuário ou senha incorretos.'},{status:401,headers:{'Cache-Control':'no-store'}});
  const token=hex(crypto.getRandomValues(new Uint8Array(32)));
  await database().batch([
   database().prepare('DELETE FROM auth_attempts WHERE id=? OR reset_at<=?').bind(key,now),
   database().prepare('DELETE FROM auth_sessions WHERE expires_at<=?').bind(now),
   database().prepare('INSERT INTO auth_sessions (id,expires_at,credential_version) VALUES (?,?,?)').bind(await digest(token),now+604800000,await digest(config.hash))
  ]);
  return Response.json({ok:true},{headers:{'Set-Cookie':cookieValue(request,token,604800),'Cache-Control':'no-store'}});
 }catch(e){console.error('Login unavailable',e instanceof Error?e.message:'unknown');return Response.json({error:'Não foi possível entrar agora. Tente novamente.'},{status:503});}
}
