import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection } from '../../shared/config.ts';
import { authorize, withHttp, failure } from '../../shared/http.ts';
import { readJson, json, apiError } from '../../shared/api.ts';
serve(withHttp(async (request) => {
    try {
        const { url, key } = serverConnection();
        const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        await authorize(request, client, 'admin');
        const body = await readJson(request);
        if (body.action === 'set-job') {
            if (typeof body.enabled !== 'boolean' || typeof body.job_key !== 'string')
                failure(400, 'Invalid job settings');
            if (body.enabled && (!Deno.env.get('JOB_AUTH_SECRET') || Deno.env.get('SCHEDULER_READY') !== 'true'))
                failure(409, 'Configure and verify the scheduler before enabling jobs');
            const anon = Deno.env.get('SUPABASE_ANON_KEY');
            if (!anon)
                failure(503, 'Job administration unavailable');
            const caller = createClient(url, anon, { global: { headers: { Authorization: request.headers.get('Authorization') } }, auth: { persistSession: false, autoRefreshToken: false } });
            const { error } = await caller.rpc('set_scheduled_job', { job_key: body.job_key, is_enabled: body.enabled });
            if (error)
                failure(403, 'Job settings could not be saved');
        }
        const { data, error } = await client.rpc('operational_status');
        if (error)
            failure(503, 'Operations status unavailable');
        return json({ ...data, monitoring_configured: Deno.env.get('SERVER_MONITORING_ENABLED') === 'true', scheduler_ready: Deno.env.get('SCHEDULER_READY') === 'true' });
    }
    catch (error) {
        return apiError(error);
    }
}, 'operations-status'));
