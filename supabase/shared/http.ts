import {recordServerFailure} from './monitoring.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-job-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Disposition',
};
export function withHttp(handler: (request: Request) => Promise<Response>, functionName = 'unknown') {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Use POST' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    let response:Response;
    try{response=await handler(request);}catch{response=new Response(JSON.stringify({error:'Request failed'}),{status:500,headers:{'Content-Type':'application/json'}});}
    if(response.status>=500)await recordServerFailure(functionName,response.status);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
    return new Response(response.body, {status: response.status, headers});
  };
}
export function failure(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}
export async function authorize(request: Request, client: any, mode: 'user' | 'admin' | 'job' = 'user'): Promise<any> {
  if (mode === 'job') {
    const expected = Deno.env.get('JOB_AUTH_SECRET')?.trim();
    const supplied = request.headers.get('x-job-secret');
    if (expected && supplied) {
      const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
      const [a, b] = await Promise.all([digest(expected), digest(supplied)]);
      let difference = 0;
      for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
      if (difference === 0) return { automation: true };
      failure(401, 'Invalid automation credential');
    }
  }
  const match = request.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i);
  if (!match) failure(401, 'Authentication required');
  const { data, error } = await client.auth.getUser(match[1]);
  if (error || !data?.user) failure(401, 'Invalid session');
  const { data: profile, error: profileError } = await client.from('users').select('id, role, is_super_admin, is_active').eq('id', data.user.id).maybeSingle();
  if (profileError) failure(503, 'Account access could not be checked');
  if (!profile || profile.is_active === false) failure(403, 'Active account required');
  if (mode !== 'user' && !(profile.is_super_admin === true || profile.role === 'admin')) failure(403, 'Administrator access required');
  return data.user;
}
export function webhookPayload(body: any) {
  return {
    data: body.record ?? body.data,
    old_data: body.old_record ?? body.old_data,
    event: { type: String(body.type || body.event?.type || '').toLowerCase() },
  };
}
