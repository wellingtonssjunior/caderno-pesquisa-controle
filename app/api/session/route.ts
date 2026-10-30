import { authenticated } from '@/lib/auth';
export async function GET(request: Request) {
  try {
    return new Response(null, { status: await authenticated(request.headers.get('cookie')) ? 204 : 401, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
