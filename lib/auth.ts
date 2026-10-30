import { env } from 'cloudflare:workers';
import { database } from './store';

export const sessionCookie = 'research_session';
const encoder = new TextEncoder();
export function hex(bytes: ArrayBuffer | Uint8Array) { return Array.from(new Uint8Array(bytes as ArrayBuffer)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
export async function digest(value:string) { return hex(await crypto.subtle.digest('SHA-256',encoder.encode(value))); }
export function configuration() {
 if (!env.RESEARCH_USERNAME || !env.RESEARCH_PASSWORD_HASH) throw new Error('Authentication configuration unavailable');
 return {username:env.RESEARCH_USERNAME, hash:env.RESEARCH_PASSWORD_HASH};
}
export function tokenFrom(cookie:string|null) { const token=cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith(sessionCookie+'='))?.slice(sessionCookie.length+1); return token && /^[a-f0-9]{64}$/.test(token)?token:null; }
export async function authenticated(cookie:string|null) {
 const token=tokenFrom(cookie); if(!token)return false;
 const version=await digest(configuration().hash);
 const row=await database().prepare('SELECT id FROM auth_sessions WHERE id=? AND expires_at>? AND credential_version=?').bind(await digest(token),Date.now(),version).first();
 return !!row;
}
export function sameOrigin(request:Request) { return request.headers.get('origin')===new URL(request.url).origin; }
export function cookieValue(request:Request,token:string,age:number) {
 const local=['localhost','127.0.0.1'].includes(new URL(request.url).hostname);
 return `${sessionCookie}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${local?'':'; Secure'}`;
}
export async function verifyPassword(password:string,stored:string) {
 const [salt,expected]=stored.split(':');
 if(!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{64}$/.test(expected))throw new Error('Invalid authentication configuration');
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const value=hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:Uint8Array.from(salt.match(/../g)!.map(v=>parseInt(v,16))),iterations:100000},key,256));
 let difference=0; for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^value.charCodeAt(i);
 return difference===0;
}
