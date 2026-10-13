import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection } from '../../shared/config.ts';
import { withHttp, failure } from '../../shared/http.ts';
import { readText, text, json, apiError, providerJson } from '../../shared/api.ts';
import { gatewayCredentials } from '../../shared/gateways.ts';
serve(withHttp(async (request) => {
    try {
        const raw = await readText(request), signature = request.headers.get('x-paystack-signature');
        if (!signature || !/^[0-9a-f]{128}$/i.test(signature))
            failure(401, 'Invalid webhook authentication');
        let event;
        try {
            event = JSON.parse(raw);
        }
        catch {
            failure(400, 'Invalid JSON');
        }
        if (!event || !event.data || !['test', 'live'].includes(event.data.domain))
            failure(400, 'Invalid payment event');
        const credentials = gatewayCredentials('paystack', event.data.domain);
        const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(credentials.key), { name: 'HMAC', hash: 'SHA-512' }, false, ['verify']);
        const signed = Uint8Array.from(signature.match(/../g)!.map(value => parseInt(value, 16)));
        if (!await crypto.subtle.verify('HMAC', key, signed, new TextEncoder().encode(raw)))
            failure(401, 'Invalid webhook authentication');
        if (event.event !== 'charge.success')
            return json({ received: true, ignored: true });
        const reference = text(event.data.reference, 'reference', 100);
        if (!/^[a-zA-Z0-9.=-]+$/.test(reference))
            failure(400, 'Invalid payment reference');
        const verified = await providerJson(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET', headers: { Authorization: `Bearer ${credentials.key}` } });
        const payment = verified.data;
        if (verified.status !== true || payment?.status !== 'success' || payment.reference !== reference || payment.domain !== credentials.mode || !Number.isInteger(payment.amount) || payment.amount < 100 || payment.currency !== 'ZAR' || !Number.isSafeInteger(payment.id))
            failure(400, 'Payment verification failed');
        const { url, key: serverKey } = serverConnection();
        const client = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const paymentId = `paystack-${payment.id}`;
        const { data, error } = await client.rpc('fulfill_gateway_payment', { event_key: paymentId, checkout_key: reference, payment_key: paymentId, paid_amount: payment.amount, paid_currency: payment.currency, paid_mode: payment.domain, provider_key: 'paystack' });
        if (error)
            failure(503, 'Payment requires reconciliation. Retry this event.');
        return json(data);
    }
    catch (error) {
        return apiError(error);
    }
}, 'paystack-webhook'));
