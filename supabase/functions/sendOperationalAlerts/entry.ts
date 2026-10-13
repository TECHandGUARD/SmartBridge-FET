import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection, emailSettings } from '../../shared/config.ts';
import { authorize, withHttp, failure } from '../../shared/http.ts';
import { json, apiError } from '../../shared/api.ts';
import { emailFetch } from '../../shared/email.ts';
serve(withHttp(async (request) => {
    try {
        const { url, key } = serverConnection();
        const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        await authorize(request, client, 'job');
        const windowStart = new Date(Math.floor(Date.now() / 900000) * 900000).toISOString();
        const previous = await client.rpc('alert_window_recorded', { chosen_window: windowStart });
        if (previous.error)
            failure(503, 'Alert tracking unavailable');
        if (previous.data === true)
            return json({ skipped: true });
        const { data: status, error } = await client.rpc('operational_status');
        if (error)
            failure(503, 'Operations status unavailable');
        const failures = (status.jobs || []).filter((job: any) => job.enabled && (job.status === 'failed' || job.status === 'partial' || (job.last_started && (!job.last_finished || job.last_started > job.last_finished) && Date.now() - Date.parse(job.last_started) > 180000)));
        const errors = (status.events || []).filter((event: any) => event.source !== 'client' && Date.now() - Date.parse(event.created_at) < 900000);
        if (!failures.length && !errors.length)
            return json({ skipped: true });
        const { data: admins, error: adminsError } = await client.from('users').select('email,role,is_super_admin').eq('is_active', true);
        if (adminsError)
            failure(503, 'Alert recipients unavailable');
        const recipients = (admins || []).filter((profile: any) => profile.role === 'admin' || profile.is_super_admin === true).map((profile: any) => profile.email);
        if (!recipients.length)
            failure(503, 'No active administrator recipient');
        const settings = emailSettings();
        const ids = [];
        for (const to of recipients) {
            const response = await emailFetch({ method: 'POST', headers: { Authorization: `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: settings.from, to: [to], subject: `SmartBridge operational alert — ${windowStart}`, text: `${failures.length} jobs need attention; ${errors.length} recent server failures.\nOpen Admin Dashboard → Operations for details. No learner content is included.` }) }, client);
            if (!response.ok)
                failure(503, 'Alert delivery was not accepted');
            ids.push((await response.json()).id);
        }
        const saved = await client.rpc('save_alert_window', { chosen_window: windowStart, email_ids: ids });
        if (saved.error)
            failure(503, 'Alert tracking unavailable');
        return json({ accepted: ids.length });
    }
    catch (error) {
        return apiError(error);
    }
}, 'send-operational-alerts'));
