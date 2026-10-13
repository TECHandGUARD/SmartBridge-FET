import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection } from '../../shared/config.ts';
import { authorize, withHttp, failure } from '../../shared/http.ts';
import { readJson, text, consumeQuota, json, apiError } from '../../shared/api.ts';
import { generate, studyPlanSchema } from '../../shared/ai.ts';
serve(withHttp(async (request) => {
    try {
        const { url, key } = serverConnection();
        const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        const user = await authorize(request, client);
        const body = await readJson(request);
        const prompt = text(body.prompt, 'prompt', 12000);
        if (body.model || body.provider || body.url)
            failure(400, 'Model and provider are configured on the server');
        const structured = body.task === 'study-plan';
        if (body.task && !['study-plan', 'study-assistant'].includes(body.task))
            failure(400, 'Unknown AI task');
        if (body.response_json_schema && !structured)
            failure(400, 'Choose the study-plan task for structured output');
        await consumeQuota(client, user.id, 'ai');
        return json(await generate(prompt, structured ? studyPlanSchema : undefined));
    }
    catch (error) {
        return apiError(error);
    }
}, 'invoke-llm'));
