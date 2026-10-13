import { requiredEnv } from './config.ts';
import { failure } from './http.ts';
export async function verifySignedWebhook(request: Request, raw: string, secretName: string, prefix = 'webhook', tolerance = 180, secretOverride?: string): Promise<void> {
    const id = request.headers.get(`${prefix}-id`), timestamp = request.headers.get(`${prefix}-timestamp`), signatures = request.headers.get(`${prefix}-signature`);
    if (!id || id.length > 200 || !timestamp || !/^\d+$/.test(timestamp) || !signatures || Math.abs(Date.now() / 1000 - Number(timestamp)) > tolerance)
        failure(401, 'Invalid webhook authentication');
    const secret = secretOverride || requiredEnv(secretName);
    if (!secret.startsWith('whsec_'))
        failure(503, 'Webhook secret configuration is invalid');
    let bytes: Uint8Array;
    try {
        bytes = Uint8Array.from(atob(secret.slice(6)), c => c.charCodeAt(0));
    }
    catch {
        failure(503, 'Webhook secret configuration is invalid');
    }
    if (bytes.length < 16)
        failure(503, 'Webhook secret configuration is invalid');
    const key = await crypto.subtle.importKey('raw', new Uint8Array(bytes), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const content = new TextEncoder().encode(`${id}.${timestamp}.${raw}`);
    for (const value of signatures.split(' ')) {
        if (!value.startsWith('v1,'))
            continue;
        try {
            const signature = Uint8Array.from(atob(value.slice(3)), c => c.charCodeAt(0));
            if (await crypto.subtle.verify('HMAC', key, signature, content))
                return;
        }
        catch { /* Invalid alternative signature. */ }
    }
    failure(401, 'Invalid webhook authentication');
}
