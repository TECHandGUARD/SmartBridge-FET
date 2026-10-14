import { requiredEnv } from './config.ts';
import { failure } from './http.ts';
export function paymentSettings() {
    if (Deno.env.get('PAYMENTS_API_ENABLED') !== 'true')
        failure(503, 'Online checkout is unavailable');
    const mode = requiredEnv('YOCO_MODE'), key = requiredEnv('YOCO_SECRET_KEY');
    if (!['test', 'live'].includes(mode) || !key.startsWith(`sk_${mode}_`))
        failure(503, 'Payment mode configuration is invalid');
    return { mode, key };
}
export async function planAmount(product: string,client: any): Promise<number> {
 if(!['student','parent','tutor_pro'].includes(product))failure(400,'Unknown plan');
 const {data,error}=await client.from('subscription_prices').select('amount_cents').eq('product',product).maybeSingle();
 if(error||!data||!Number.isInteger(data.amount_cents)||data.amount_cents<1||data.amount_cents>2147483647)failure(503,'Current plan price unavailable');
 return data.amount_cents;
}
export function checkoutUrl(value: unknown, provider: 'yoco'|'paystack' = 'yoco'): string {
    if (typeof value !== 'string')
        failure(502, 'Invalid checkout redirect');
    let url: URL;
    try {
        url = new URL(value);
    }
    catch {
        failure(502, 'Invalid checkout redirect');
    }
    if (url.protocol !== 'https:' || !(provider === 'paystack' ? ['checkout.paystack.com'] : ['c.yoco.com', 'pay.yoco.com']).includes(url.hostname) || url.username || url.password)
        failure(502, 'Invalid checkout redirect');
    return url.href;
}
export { verifySignedWebhook } from './webhook.ts';
