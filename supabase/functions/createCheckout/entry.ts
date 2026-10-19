import {gatewayId,enabledGateway,initializeGateway,gatewayCredentials} from '../../shared/gateways.ts';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection, appUrl } from '../../shared/config.ts';
import { authorize, withHttp, failure } from '../../shared/http.ts';
import { readJson, text, uuid, consumeQuota, json, apiError, profileFor, providerJson } from '../../shared/api.ts';
import { planAmount, checkoutUrl } from '../../shared/payments.ts';
serve(withHttp(async (request) => {
    try {
        const { url, key } = serverConnection();
        const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const user = await authorize(request, client);
        const body = await readJson(request);
        if (body.action === 'refund_booking') {
            await authorize(request,client,'admin');
            const {data:refund,error:refundError}=await client.rpc('prepare_booking_refund',{actor_id:user.id,booking_key:uuid(body.booking_id,'booking_id')});
            if(refundError || !refund) failure(409,'This booking is not eligible for an automatic full refund');
            if(['refunded','pending'].includes(refund.refund_status)) return json({status:refund.refund_status});
            const credentials=gatewayCredentials('yoco',refund.mode);
            const result=await providerJson(`https://payments.yoco.com/api/checkouts/${encodeURIComponent(refund.checkout_id)}/refund`,{method:'POST',headers:{Authorization:`Bearer ${credentials.key}`,'Content-Type':'application/json','Idempotency-Key':`smartbridge-refund-${refund.id}`},body:JSON.stringify({amount:refund.amount_cents})});
            if(result.id!==refund.checkout_id || !result.refundId || !['succeeded','pending'].includes(result.status)) failure(502,'Refund requires reconciliation');
            const {error:settleError}=await client.rpc('settle_booking_refund',{checkout_key:refund.checkout_id,refund_key:result.refundId,refund_amount:refund.amount_cents,refund_mode:refund.mode,refund_currency:refund.currency,settled:result.status==='succeeded'});
            if(settleError)failure(503,'Provider accepted refund; recording requires retry');
            return json({status:result.status==='succeeded'?'refunded':'pending'});
        }
        const product = text(body.product, 'product', 20), id = uuid(body.request_id, 'request_id');
        if (['amount', 'user_id', 'successUrl', 'cancelUrl', 'failureUrl'].some(field => Object.hasOwn(body, field)))
            failure(400, 'Price, account and callback URLs are chosen by the server');
        const provider = gatewayId(body.gateway || 'yoco');
        const settings = await enabledGateway(client,provider);
        const amount = product === 'booking' ? null : await planAmount(product,client);
        await consumeQuota(client, user.id, 'checkout');
        const { data: order, error } = await client.rpc(product === 'booking' ? 'create_booking_payment_order' : 'create_gateway_payment_order', product === 'booking' ? {actor_id:user.id,booking_key:uuid(body.booking_id,'booking_id'),payment_mode:settings.mode,provider_key:provider} : { actor_id: user.id, request_id: id, product_key: product, quoted_amount: amount, payment_mode: settings.mode, provider_key: provider });
        if (error || !order)
            failure(409, 'Payment intent unavailable for this account');
        if (order.status === 'paid')
            return json({ order_id: order.id, status: 'paid' });
        if (order.checkout_id && order.redirect_url)
            return json({ order_id: order.id, redirect_url: checkoutUrl(order.redirect_url,provider), amount_cents: order.amount_cents, mode: order.mode,gateway:provider });
        // Fail with a clear configuration error rather than an unhandled 500.
        if (!Deno.env.get('APP_BASE_URL')?.trim() && !Deno.env.get('APP_URL')?.trim()) failure(503, 'Payment return URL is not configured');
        const profile=await profileFor(client,user.id);
        const checkout=await initializeGateway(provider,settings,order,profile.email);
        const redirect=checkout.redirect;
        const { error: saveError } = await client.from('payment_orders').update({ checkout_id: checkout.id, redirect_url: redirect }).eq('id', order.id).eq('user_id', user.id);
        if (saveError)
            failure(503, 'Checkout tracking unavailable. Retry the same request.');
        return json({ order_id: order.id, redirect_url: redirect, amount_cents: order.amount_cents, mode: settings.mode, gateway:provider });
    }
    catch (error) {
        if (!Number.isInteger(error?.status)) console.error('checkout_unexpected_failure', error instanceof Error ? error.message : 'unknown');
        return apiError(error);
    }
}, 'create-checkout'));
