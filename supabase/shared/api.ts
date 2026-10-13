import { failure } from './http.ts';
export function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
export function apiError(error: any): Response {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    // Never return provider bodies, credentials or database details to callers.
    return json({ error: status === 500 ? 'Request failed. Please try again.' : error.message }, status);
}
export async function readText(request: Request, maxBytes = 32768): Promise<string> {
    if (Number(request.headers.get('content-length')) > maxBytes)
        failure(413, 'Request too large');
    const reader = request.body?.getReader();
    if (!reader)
        failure(400, 'Request body required');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
        const { value, done } = await reader.read();
        if (done)
            break;
        size += value.byteLength;
        if (size > maxBytes) {
            await reader.cancel();
            failure(413, 'Request too large');
        }
        chunks.push(value);
    }
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
    }
    return new TextDecoder().decode(buffer);
}
export async function readJson(request: Request): Promise<any> {
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))
        failure(415, 'Use application/json');
    const raw = await readText(request);
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        failure(400, 'Invalid JSON');
    }
    if (!value || typeof value !== 'object' || Array.isArray(value))
        failure(400, 'JSON object required');
    return value;
}
export function text(value: unknown, name: string, max = 1000): string {
    if (typeof value !== 'string' || !value.trim() || value.length > max)
        failure(400, `${name} must be between 1 and ${max} characters`);
    return value.trim();
}
export function uuid(value: unknown, name = 'id'): string {
    const result = text(value, name, 36);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result))
        failure(400, `${name} must be a UUID`);
    return result;
}
export async function profileFor(client: any, id: string) {
    const { data, error } = await client.from('users').select('id,email,role,is_active,is_verified,is_super_admin').eq('id', id).maybeSingle();
    if (error)
        failure(503, 'Account access unavailable');
    if (!data || data.is_active !== true)
        failure(403, 'Active account required');
    return data;
}
export function isAdmin(profile: any): boolean { return profile.is_super_admin === true || profile.role === 'admin'; }
export async function consumeQuota(client: any, userId: string, scope: 'ai' | 'email' | 'checkout') {
    const { data, error } = await client.rpc('consume_api_quota', { actor_id: userId, quota_scope: scope });
    if (error)
        failure(503, 'API usage controls unavailable');
    if (data !== true)
        failure(429, 'Usage limit reached. Try again later.');
}
export async function providerJson(url: string, options: RequestInit, timeout = 20000): Promise<any> {
    let response: Response;
    try {
        response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeout) });
    }
    catch {
        failure(503, 'Provider temporarily unavailable');
    }
    if (!response.ok)
        failure(response.status === 429 ? 429 : 502, response.status === 429 ? 'Provider busy. Try again later.' : 'Provider request failed');
    try {
        return await response.json();
    }
    catch {
        failure(502, 'Invalid provider response');
    }
}
