import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection, requiredEnv } from '../../shared/config.ts';
import { authorize, withHttp, failure } from '../../shared/http.ts';
import { readJson, text, json, apiError } from '../../shared/api.ts';
const allowed = new Set(['send-study-reminders', 'send-session-reminders', 'send-nbt-reminders', 'send-deadline-reminders', 'expire-subscriptions', 'send-weekly-parent-reports', 'send-operational-alerts', 'dispatch-notifications', 'coo-tutor-onboarding']);
serve(withHttp(async (request) => {
    try {
        const { url, key } = serverConnection();
        const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        await authorize(request, client, 'job');
        const body = await readJson(request);
        const jobKey = text(body.job_key, 'job_key', 40), id = crypto.randomUUID();
        const { data: job, error } = await client.rpc('claim_operational_job', { job_key: jobKey, run_id: id });
        if (error)
            failure(503, 'Job controls unavailable');
        if (!job)
            return json({ skipped: true });
        let status = 'failed';
        try {
            if (!allowed.has(job.function_slug))
                failure(400, 'Unknown job target');
            const response = await fetch(`${url}/functions/v1/${job.function_slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-job-secret': requiredEnv('JOB_AUTH_SECRET') }, body: JSON.stringify(job.body || {}), signal: AbortSignal.timeout(60000) });
            const result = await response.json();
            status = response.ok ? ((Array.isArray(result?.errors) && result.errors.length) || result?.failed > 0 ? 'partial' : 'success') : 'failed';
        }
        catch {
            status = 'failed';
        }
        const { data: finished, error: finishError } = await client.rpc('finish_operational_job', { job_key: jobKey, run_id: id, run_status: status });
        if (finishError || finished !== true)
            failure(503, 'Job completion could not be recorded');
        return json({ job_key: jobKey, status }, status === 'success' ? 200 : 503);
    }
    catch (error) {
        return apiError(error);
    }
}, 'run-scheduled-job'));
