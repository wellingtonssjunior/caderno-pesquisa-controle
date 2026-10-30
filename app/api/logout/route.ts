import { cookieValue, digest, sameOrigin, tokenFrom } from '@/lib/auth';
import { database } from '@/lib/store';
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:'Origem inválida.'},{status:403});
 try{const token=tokenFrom(request.headers.get('cookie'));if(token)await database().prepare('DELETE FROM auth_sessions WHERE id=?').bind(await digest(token)).run();
 return Response.json({ok:true},{headers:{'Set-Cookie':cookieValue(request,'',0),'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Não foi possível encerrar a sessão.'},{status:503})}
}
