import { database } from '@/lib/store';
import { authenticated, sameOrigin } from '@/lib/auth';
export async function GET(request:Request) {
 try { if(!await authenticated(request.headers.get('cookie')))return Response.json({error:'Entre para acessar o caderno.'},{status:401,headers:{'Cache-Control':'no-store'}}); const {results} = await database().prepare('SELECT id, value FROM entries').all<{id:string,value:string}>(); return Response.json(Object.fromEntries(results.map(r=>[r.id,JSON.parse(r.value)])),{headers:{'Cache-Control':'no-store'}}); }
 catch(e) { console.error(e); return Response.json({error:'Não foi possível carregar o caderno.'},{status:503}); }
}
export async function PUT(request:Request) {
 if(!sameOrigin(request)) return Response.json({error:'Origem inválida'},{status:403});
 try { if(!await authenticated(request.headers.get('cookie')))return Response.json({error:'Sua sessão expirou. Entre novamente.'},{status:401}); const body=await request.text(); if(body.length>100000) return Response.json({error:'Registro muito grande'},{status:413}); const {id,value}=JSON.parse(body);
 if(typeof id!=='string'||! /^[a-z0-9_-]{1,100}$/.test(id)||typeof value!=='object'||value===null) return Response.json({error:'Registro inválido'},{status:400});
 await database().prepare('INSERT INTO entries (id,value,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at').bind(id,JSON.stringify(value),new Date().toISOString()).run();
 return Response.json({saved:true}); } catch(e) { console.error(e); return Response.json({error:'Não foi possível salvar. Seu texto continua na tela; tente novamente.'},{status:503}); }
}
