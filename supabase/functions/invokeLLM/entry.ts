import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection } from '../../shared/config.ts';
import { authorize, withHttp, failure } from '../../shared/http.ts';
import { readJson, text, consumeQuota, json, apiError } from '../../shared/api.ts';
import { generate, studyPlanSchema } from '../../shared/ai.ts';
import { retrieveLearningEvidence, groundedInstructions } from '../../shared/grounding.ts';
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
        const subject=typeof body.subject==='string'&&body.subject.length<=100?body.subject:'';
        const grade=['Grade 10','Grade 11','Grade 12'].includes(body.grade)?body.grade:'';
        const question=typeof body.question==='string'&&body.question.trim()?text(body.question,'question',2000):prompt;
        const {evidence,sources}=await retrieveLearningEvidence(client,question,subject,grade);

        await consumeQuota(client, user.id, 'ai');
        const augmented=evidence?`${groundedInstructions}\n\nReference excerpts:\n${evidence}\n\nLearner request:\n${prompt}`:`${prompt}\n\nNo matching SmartBridge documents were found. Explain using general educational knowledge, clearly disclose that this answer is not verified against SmartBridge learning documents, and never invent CAPS or textbook citations. Acknowledge uncertainty where appropriate.`;
        const result=await generate(augmented,structured?studyPlanSchema:undefined);
        if(structured)return json({...result,sources,grounded:!!evidence});
        const refs=[...new Set(sources.map((s:any)=>`${s.title} (p. ${s.page})`))];
        return json({response:result.response+(refs.length?'\n\nSources: '+refs.join('; '):'\n\nSource: General AI knowledge (not verified against uploaded textbooks).'),sources,grounded:!!evidence});
    }
    catch (error) {
        return apiError(error);
    }
}, 'invoke-llm'));
