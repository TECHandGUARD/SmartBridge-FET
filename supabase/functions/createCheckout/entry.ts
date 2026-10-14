import {gatewayId,enabledGateway,initializeGateway} from '../../shared/gateways.ts';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection, appUrl } from '../../shared/config.ts';
import { authorize, withHttp, failure } from '../../shared/http.ts';
import { readJson, text, uuid, consumeQuota, json, apiError, profileFor } from '../../shared/api.ts';
import { planAmount, checkoutUrl } from '../../shared/payments.ts';
serve(withHttp(async (request) => {
    try {
        const { url, key } = serverConnection();
        const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const user = await authorize(request, client);
        const body = await readJson(request), product = text(body.product, 'product', 20), id = uuid(body.request_id, 'request_id');
        if (['amount', 'user_id', 'successUrl', 'cancelUrl', 'failureUrl'].some(field => Object.hasOwn(body, field)))
            failure(400, 'Price, account and callback URLs are chosen by the server');
        const provider = gatewayId(body.gateway || 'yoco');
        const settings = await enabledGateway(client,provider), amount = await planAmount(product,client);
        await consumeQuota(client, user.id, 'checkout');
        const { data: order, error } = await client.rpc('create_gateway_payment_order', { actor_id: user.id, request_id: id, product_key: product, quoted_amount: amount, payment_mode: settings.mode, provider_key: provider });
        if (error || !order)
            failure(409, 'Payment intent unavailable for this account');
        if (order.status === 'paid')
            return json({ order_id: order.id, status: 'paid' });
        if (order.checkout_id && order.redirect_url)
            return json({ order_id: order.id, redirect_url: checkoutUrl(order.redirect_url,provider), amount_cents: order.amount_cents, mode: order.mode,gateway:provider });
        const profile=await profileFor(client,user.id);
        const checkout=await initializeGateway(provider,settings,order,profile.email);
        const redirect=checkout.redirect;
        const { error: saveError } = await client.from('payment_orders').update({ checkout_id: checkout.id, redirect_url: redirect }).eq('id', order.id).eq('user_id', user.id);
        if (saveError)
            failure(503, 'Checkout tracking unavailable. Retry the same request.');
        return json({ order_id: order.id, redirect_url: redirect, amount_cents: order.amount_cents, mode: settings.mode, gateway:provider });
    }
    catch (error) {
        return apiError(error);
    }
}, 'create-checkout'));
