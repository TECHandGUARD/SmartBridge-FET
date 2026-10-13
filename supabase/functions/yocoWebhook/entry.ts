import {gatewayCredentials} from '../../shared/gateways.ts';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection } from '../../shared/config.ts';
import { withHttp, failure } from '../../shared/http.ts';
import { readText, text, json, apiError } from '../../shared/api.ts';
import { verifySignedWebhook } from '../../shared/payments.ts';
serve(withHttp(async (request) => {
    try {
        const raw = await readText(request);
        let event;
        try {
            event = JSON.parse(raw);
        }
        catch {
            failure(400, 'Invalid JSON');
        }
        if (!event || typeof event !== 'object' || Array.isArray(event)) failure(400, 'Invalid event');
        const mode=event.payload?.mode;
        const credentials=gatewayCredentials('yoco',mode);
        await verifySignedWebhook(request,raw,'YOCO_WEBHOOK_SECRET','webhook',180,credentials.webhookSecret);
        if (!['payment.succeeded', 'payment.failed'].includes(event.type))
            return json({ received: true, ignored: true });
        const payload = event.payload;
        if (!payload || payload.mode !== mode)
            failure(400, 'Payment mode mismatch');
        if (event.type === 'payment.failed')
            return json({ received: true, failed: true });
        if (payload.status !== 'succeeded' || payload.type !== 'payment' || !Number.isInteger(payload.amount) || payload.amount < 100 || payload.currency !== 'ZAR')
            failure(400, 'Invalid payment event');
        const { url, key } = serverConnection();
        const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data, error } = await client.rpc('fulfill_gateway_payment', { event_key: text(event.id, 'event_id', 200), checkout_key: text(payload.metadata?.checkoutId, 'checkout_id', 200), payment_key: text(payload.id, 'payment_id', 200), paid_amount: payload.amount, paid_currency: payload.currency, paid_mode: payload.mode,provider_key:'yoco' });
        if (error)
            failure(503, 'Payment requires reconciliation. Retry this event.');
        return json(data);
    }
    catch (error) {
        return apiError(error);
    }
}, 'yoco-webhook'));
