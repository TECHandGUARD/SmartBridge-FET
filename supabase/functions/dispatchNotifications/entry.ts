import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection, emailSettings, appUrl } from '../../shared/config.ts';
import { authorize, withHttp, failure } from '../../shared/http.ts';
import { readJson, uuid, json, apiError } from '../../shared/api.ts';
import { emailFetch } from '../../shared/email.ts';

serve(withHttp(async request => {
  try {
    const connection = serverConnection();
    const client = createClient(connection.url, connection.key, { auth: { persistSession: false, autoRefreshToken: false } });
    const meetingJob = request.headers.has('x-meeting-job-token');
    const job = request.headers.has('x-job-secret');
    let actor;
    if (meetingJob) {
      const { data: valid, error } = await client.rpc('consume_meeting_mail_token', { job_token: request.headers.get('x-meeting-job-token') });
      if (error || valid !== true) failure(401, 'Invalid meeting worker credential');
      actor = { id: null };
    } else if (job) {
      const credential = await authorize(request, client, 'job');
      if (credential.automation !== true) failure(401, 'Automation credential required');
      actor = { id: null };
    } else actor = await authorize(request, client);
    const body = await readJson(request);
    if (meetingJob) {
      emailSettings(); // Fail visibly when sender configuration is missing, even with an empty queue.
      const pending = await client.rpc('prepare_meeting_emails');
      if (pending.error) failure(503, 'Meeting email queue unavailable');
      body.event_ids = pending.data || [];
      if (!body.event_ids.length) return json({ accepted: 0, failed: 0, email_configured: true });
    } else if (job) { const pending = await client.rpc('pending_action_notification_ids', { batch_size: 10 }); if (pending.error) failure(503, 'Notification queue unavailable'); body.event_ids = pending.data || []; if (!body.event_ids.length) return json({ accepted: 0, failed: 0 }); }
    if (!Array.isArray(body.event_ids) || body.event_ids.length > 10 || !body.event_ids.length) failure(400, 'Supply one to ten notification IDs');
    const ids = [...new Set(body.event_ids.map((id: unknown) => uuid(id)))];
    let accepted = 0, failed = 0;
    for (const id of ids) {
      const { data: event, error } = await client.rpc('claim_action_notification', { event_id: id, caller_id: actor.id });
      if (error) failure(403, 'Notification unavailable');
      if (!event) continue;
      try {
        const settings = emailSettings();
        const response = await emailFetch({ method: 'POST', headers: { Authorization: `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: settings.from, to: [event.to], subject: event.subject,
            text: `${event.message}\n\n${event.meeting_id ? `Open meeting: ${appUrl('/meetings/' + uuid(event.meeting_id))}` : `Sign in: ${appUrl('/login')}`}\nReference: ${event.id}\nSmartBridge FET / Tech & GUARD (Pty) Ltd` }) }, client);
        if (!response.ok) throw new Error('provider_rejected');
        const result = await response.json();
        const finished = await client.rpc('finish_action_notification', { event_id: id, message_id: result.id, error_code: null });
        if (finished.error) throw new Error('receipt_pending');
        accepted++;
      } catch {
        await client.rpc('finish_action_notification', { event_id: id, message_id: null, error_code: 'delivery_configuration_or_provider_failure' });
        failed++;
      }
    }
    return json({ accepted, failed, status: failed ? 'queued' : accepted ? 'accepted' : 'pending', delivered: false });
  } catch (error) { return apiError(error); }
}, 'dispatch-notifications'));
