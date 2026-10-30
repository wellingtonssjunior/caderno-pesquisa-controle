import { headers } from 'next/headers';
import { authenticated } from '@/lib/auth';
import Notebook from '@/components/notebook';
import Login from '@/components/login';
export const dynamic = 'force-dynamic';
export default async function Page(){
 let allowed=false;
 try{allowed=await authenticated((await headers()).get('cookie'));}catch{ /* Fail closed; login displays a recoverable error if storage is unavailable. */ }
 return allowed?<Notebook/>:<Login/>;
}
