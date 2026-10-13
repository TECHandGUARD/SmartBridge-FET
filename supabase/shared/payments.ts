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
export function planAmount(product: string): number {
    const settings = { student: 'PAYMENT_STUDENT_AMOUNT_CENTS', parent: 'PAYMENT_PARENT_AMOUNT_CENTS', tutor_pro: 'PAYMENT_TUTOR_PRO_AMOUNT_CENTS' };
    if (!Object.hasOwn(settings, product))
        failure(400, 'Unknown plan');
    const value = Number(requiredEnv(settings[product]));
    if (!Number.isInteger(value) || value < 100 || value > 1000000)
        failure(503, 'Plan price configuration is invalid');
    return value;
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
