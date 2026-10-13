import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection } from '../../shared/config.ts';
import { authorize, withHttp, failure } from '../../shared/http.ts';
import { readJson, text, json, apiError } from '../../shared/api.ts';
serve(withHttp(async (request) => {
    try {
        const { url, key } = serverConnection();
        const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const user = await authorize(request, client);
        const body = await readJson(request), email = text(body.recipient_email, 'recipient_email', 254), reference = text(body.file_ref, 'file_ref', 300), label = text(body.file_name, 'file_name', 200);
        const { data: peer, error } = await client.from('users').select('id').eq('email', email).maybeSingle();
        if (error || !peer)
            failure(403, 'Attachment recipient unavailable');
        const { data, error: sendError } = await client.rpc('create_chat_attachment', { actor_id: user.id, receiver_id: peer.id, file_ref: reference, file_label: label });
        if (sendError)
            failure(403, 'Attachment sharing requires a verified booking relationship');
        return json({ id: data });
    }
    catch (error) {
        return apiError(error);
    }
}, 'send-chat-attachment'));
