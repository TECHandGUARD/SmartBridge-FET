import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection } from '../../shared/config.ts';
import { withHttp, failure } from '../../shared/http.ts';
import { readText, text, json, apiError } from '../../shared/api.ts';
import { verifySignedWebhook } from '../../shared/webhook.ts';
serve(withHttp(async (request) => {
    try {
        const raw = await readText(request);
        await verifySignedWebhook(request, raw, 'RESEND_WEBHOOK_SECRET', 'svix', 300);
        let event;
        try {
            event = JSON.parse(raw);
        }
        catch {
            failure(400, 'Invalid JSON');
        }
        if (!event || typeof event !== 'object' || Array.isArray(event)) failure(400, 'Invalid event');
        const types = ['email.sent', 'email.delivered', 'email.bounced', 'email.complained', 'email.delivery_delayed', 'email.failed', 'email.suppressed'];
        if (!types.includes(event.type))
            return json({ received: true, ignored: true });
        const recipients = event.data?.to;
        if (!Array.isArray(recipients) || !recipients.length || recipients.length > 50 || recipients.some((value: any) => typeof value !== 'string' || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)))
            failure(400, 'Invalid email recipients');
        if (typeof event.created_at !== 'string' || !Number.isFinite(Date.parse(event.created_at)))
            failure(400, 'Invalid event timestamp');
        const { url, key } = serverConnection();
        const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data, error } = await client.rpc('record_email_event', { event_key: request.headers.get('svix-id'), provider_id: text(event.data.email_id, 'email_id', 200), event_type: event.type, event_time: event.created_at, recipient_emails: recipients.map((value: string) => value.toLowerCase()) });
        if (error)
            failure(503, 'Email delivery tracking unavailable. Retry this event.');
        const eventStates: Record<string,string> = {
            'email.sent': 'accepted', 'email.delivered':'delivered',
            'email.bounced':'bounced', 'email.complained':'suppressed',
            'email.failed':'failed', 'email.suppressed':'suppressed'
        };
        const state = eventStates[event.type];
        if (state) {
            const { error: cooError } = await client.from('coo_tutor_email_log')
                .update({ state, updated_at: new Date().toISOString() })
                .eq('provider_id', event.data.email_id)
                .in('recipient_email', recipients.map((v:string)=>v.toLowerCase()))
                .in('state', state === 'accepted' ? ['reserved','accepted'] : state === 'delivered' ? ['reserved','accepted','delivered'] : ['reserved','accepted','delivered','failed']);
            if (cooError && cooError.code !== '42P01')
                failure(503, 'COO delivery tracking unavailable. Retry this event.');
        }
        return json(data);
    }
    catch (error) {
        return apiError(error);
    }
}, 'resend-webhook'));
