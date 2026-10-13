import { failure } from './http.ts';
import { providerJson } from './api.ts';
import { appUrl } from './config.ts';
import { checkoutUrl } from './payments.ts';
export const gatewayCatalog = {
    yoco: { name: 'Yoco', webhook: 'yoco-webhook' },
    paystack: { name: 'Paystack', webhook: 'paystack-webhook' }
};
export function gatewayId(value: any): 'yoco' | 'paystack' {
    if (typeof value !== 'string' || !Object.hasOwn(gatewayCatalog, value))
        failure(400, 'Unsupported payment gateway');
    return value as 'yoco' | 'paystack';
}
export function gatewayCredentials(provider: 'yoco' | 'paystack', mode: string) {
    if (!['test', 'live'].includes(mode))
        failure(400, 'Invalid payment mode');
    const prefix = provider.toUpperCase(), legacy = provider === 'yoco' && Deno.env.get('YOCO_MODE') === mode;
    const key = Deno.env.get(`${prefix}_${mode.toUpperCase()}_SECRET_KEY`)?.trim() || (legacy ? Deno.env.get('YOCO_SECRET_KEY')?.trim() : '');
    const webhookSecret = provider === 'yoco' ? (Deno.env.get(`YOCO_${mode.toUpperCase()}_WEBHOOK_SECRET`)?.trim() || (legacy ? Deno.env.get('YOCO_WEBHOOK_SECRET')?.trim() : '')) : key;
    if (!key?.startsWith(`sk_${mode}_`) || !webhookSecret || (provider === 'yoco' && !webhookSecret.startsWith('whsec_')))
        failure(503, 'Gateway credentials are not configured for this mode');
    return { key, webhookSecret, mode };
}
export function gatewayReady(provider: 'yoco' | 'paystack', mode: string): boolean { try {
    gatewayCredentials(provider, mode);
    return true;
}
catch {
    return false;
} }
export async function enabledGateway(client: any, provider: 'yoco' | 'paystack') {
    if (Deno.env.get('PAYMENTS_API_ENABLED') !== 'true')
        failure(503, 'Online checkout is unavailable');
    const { data, error } = await client.from('payment_gateway_settings').select('provider,enabled,mode,priority').eq('provider', provider).maybeSingle();
    if (error)
        failure(503, 'Gateway settings unavailable');
    if (!data?.enabled)
        failure(409, 'This gateway is not enabled');
    return gatewayCredentials(provider, data.mode);
}
export async function initializeGateway(provider: 'yoco' | 'paystack', credentials: any, order: any, email: string) {
    const headers = { 'Authorization': `Bearer ${credentials.key}`, 'Content-Type': 'application/json' };
    if (provider === 'yoco') {
        const result = await providerJson('https://payments.yoco.com/api/checkouts', { method: 'POST', headers: { ...headers, 'Idempotency-Key': `smartbridge-${order.id}` }, body: JSON.stringify({ amount: order.amount_cents, currency: 'ZAR', successUrl: appUrl('/Premium?payment=processing'), cancelUrl: appUrl('/Premium?payment=cancelled'), failureUrl: appUrl('/Premium?payment=failed'), metadata: { order_id: order.id }, externalId: order.id }) });
        if (!result.id || result.amount !== order.amount_cents || result.currency !== 'ZAR' || result.processingMode !== credentials.mode)
            failure(502, 'Checkout did not match the order');
        return { id: result.id, redirect: checkoutUrl(result.redirectUrl, provider) };
    }
    const reference = `sb-${credentials.mode}-${order.id}`;
    const result = await providerJson('https://api.paystack.co/transaction/initialize', { method: 'POST', headers, body: JSON.stringify({ email, amount: order.amount_cents, currency: 'ZAR', reference, callback_url: appUrl('/Premium?payment=processing'), metadata: { order_id: order.id } }) });
    if (result.status !== true || result.data?.reference !== reference)
        failure(502, 'Checkout initialization failed');
    return { id: reference, redirect: checkoutUrl(result.data.authorization_url, provider) };
}
