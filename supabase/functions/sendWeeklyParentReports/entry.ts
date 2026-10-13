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
        const settings = emailSettings();
        const local = new Date(Date.now() + 2 * 3600000);
        local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7));
        const week = local.toISOString().slice(0, 10);
        let sent = 0;
        const errors = [];
        const started = Date.now();
        let more = false;
        const { data: links, error } = await client.rpc('pending_weekly_report_links', { chosen_week: week, batch_size: 50 });
        if (error)
            failure(503, 'Approved relationships unavailable');
        for (const link of links || []) {
            if (Date.now() - started > 40000) {
                more = true;
                break;
            }
            try {
                const receipt = await client.rpc('weekly_report_recorded', { parent_key: link.parent_id, student_key: link.student_id, chosen_week: week });
                if (receipt.error)
                    throw new Error();
                if (receipt.data === true)
                    continue;
                const parents = await client.from('users').select('id,email,role,is_active').eq('id', link.parent_id).maybeSingle(), students = await client.from('users').select('id,email,role,is_active').eq('id', link.student_id).maybeSingle();
                if (parents.error || students.error)
                    throw new Error();
                if (parents.data?.role !== 'parent' || parents.data?.is_active !== true || students.data?.role !== 'student' || students.data?.is_active !== true)
                    continue;
                const progress = await client.from('study_progress').select('subject,study_sessions').eq('student_id', link.student_id);
                if (progress.error)
                    throw new Error();
                const stillApproved = await client.from('parent_student_links').select('id').eq('parent_id', link.parent_id).eq('student_id', link.student_id).eq('status', 'approved').maybeSingle();
                if (stillApproved.error)
                    throw new Error();
                if (!stillApproved.data)
                    continue;
                const response = await emailFetch({ method: 'POST', headers: { Authorization: `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: settings.from, to: [parents.data.email], subject: `SmartBridge weekly report — ${week}`, text: `Study progress for ${students.data.email}\n\n${(progress.data || []).map((p: any) => `${p.subject}: ${p.study_sessions || 0} completed sessions`).join('\n') || 'No activity recorded.'}` }) }, client);
                if (!response.ok)
                    throw new Error();
                const accepted = await response.json();
                const save = await client.rpc('save_weekly_report', { parent_key: link.parent_id, student_key: link.student_id, chosen_week: week, email_id: accepted.id });
                if (save.error)
                    throw new Error();
                sent++;
            }
            catch {
                errors.push('A parent report could not be completed');
            }
        }
        return json({ sent, errors, more });
    }
    catch (error) {
        return apiError(error);
    }
}, 'send-weekly-parent-reports'));
