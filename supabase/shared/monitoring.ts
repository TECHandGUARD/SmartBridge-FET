import { serverConnection } from './config.ts';
export async function recordServerFailure(code: string, status: number) {
    if (Deno.env.get('SERVER_MONITORING_ENABLED') !== 'true')
        return;
    try {
        const { url, key } = serverConnection();
        const response = await fetch(`${url}/rest/v1/rpc/record_operational_event`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(1000), body: JSON.stringify({ event_source: 'edge', event_code: /^[a-z0-9_-]{1,80}$/.test(code) ? code : 'unknown', event_status: status }) });
        if (!response.ok)
            console.warn('monitoring_write_failed');
    }
    catch {
        console.warn('monitoring_write_failed');
    }
}
