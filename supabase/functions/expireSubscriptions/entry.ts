import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection } from '../../shared/config.ts';
import { authorize, withHttp, failure } from '../../shared/http.ts';
import { json, apiError } from '../../shared/api.ts';
serve(withHttp(async (request) => {
    try {
        const { url, key } = serverConnection();
        const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        await authorize(request, client, 'job');
        const { data, error } = await client.rpc('expire_paid_subscriptions');
        if (error)
            failure(503, 'Subscription expiry unavailable');
        return json(data);
    }
    catch (error) {
        return apiError(error);
    }
}, 'expire-subscriptions'));
