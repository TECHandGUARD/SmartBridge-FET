import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection } from '../../shared/config.ts';
import { authorize, withHttp, failure } from '../../shared/http.ts';
import { readJson, json, apiError } from '../../shared/api.ts';
import { gatewayCatalog, gatewayId, gatewayReady } from '../../shared/gateways.ts';
serve(withHttp(async (request) => {
    try {
        const { url, key } = serverConnection();
        const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const body = await readJson(request), admin = body.action === 'admin-list' || body.action === 'save';
        await authorize(request, client, admin ? 'admin' : 'user');
        if (body.action === 'save') {
            const id = gatewayId(body.provider);
            if (typeof body.enabled !== 'boolean' || !['test', 'live'].includes(body.mode) || !Number.isInteger(body.priority) || body.priority < 0 || body.priority > 100)
                failure(400, 'Invalid gateway settings');
            if (body.enabled && !gatewayReady(id, body.mode))
                failure(409, 'Configure gateway credentials before enabling this mode');
            // An authenticated client binds audit attribution and DB authorization to the actual caller.
            const publicKey = Deno.env.get('SUPABASE_ANON_KEY');
            if (!publicKey)
                failure(503, 'Gateway administration unavailable');
            const caller = createClient(url, publicKey, { global: { headers: { Authorization: request.headers.get('Authorization') } }, auth: { persistSession: false, autoRefreshToken: false } });
            const { error } = await caller.rpc('set_payment_gateway', { provider_key: id, is_enabled: body.enabled, chosen_mode: body.mode, display_priority: body.priority });
            if (error)
                failure(403, 'Gateway settings could not be saved');
        }
        else if (body.action && !['list', 'admin-list'].includes(body.action))
            failure(400, 'Unknown gateway action');
        const { data, error } = await client.from('payment_gateway_settings').select('provider,enabled,mode,priority').order('priority');
        if (error)
            failure(503, 'Gateway settings unavailable');
        const items = (data || []).filter((item: any) => Object.hasOwn(gatewayCatalog, item.provider)).map((item: any) => ({ ...item, name: gatewayCatalog[item.provider].name, ready: gatewayReady(item.provider, item.mode), ...(admin ? { test_ready: gatewayReady(item.provider, 'test'), live_ready: gatewayReady(item.provider, 'live'), webhook: gatewayCatalog[item.provider].webhook } : {}) }));
        return json({ checkout_active: Deno.env.get('PAYMENTS_API_ENABLED') === 'true', gateways: admin ? items : items.filter((item: any) => item.enabled && item.ready && Deno.env.get('PAYMENTS_API_ENABLED') === 'true') });
    }
    catch (error) {
        return apiError(error);
    }
}, 'payment-gateways'));
