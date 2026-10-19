import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection } from '../../shared/config.ts';
import { authorize, withHttp, failure } from '../../shared/http.ts';
import { readJson, text, consumeQuota, json, apiError } from '../../shared/api.ts';
import { generate, studyPlanSchema } from '../../shared/ai.ts';
import { retrieveLearningEvidence } from '../../shared/grounding.ts';
import { researchLearningQuestion, hybridInstructions } from '../../shared/research.ts';
import { tutoringInstructions } from '../../shared/tutoring.ts';
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
        await consumeQuota(client, user.id, 'ai');
        let evidence='', sources:any[]=[];
        let documentSearch='completed';
        try { ({evidence,sources}=await retrieveLearningEvidence(client,question,subject,grade)); }
        catch { documentSearch='unavailable'; }
        const history=Array.isArray(body.history)?body.history.slice(-6).filter((m:any)=>['user','assistant'].includes(m?.role)&&typeof m.content==='string').map((m:any)=>({role:m.role,content:m.content.slice(0,700)})):[];
        const researchQuestion=history.length?`${history.filter((m:any)=>m.role==='user').slice(-2).map((m:any)=>m.content).join(' ')} Follow-up: ${question}`:question;
        // Chat checks external coverage even when a partial keyword match exists.
        const web=(!structured||!evidence)?await researchLearningQuestion(researchQuestion,subject,grade):{evidence:'',sources:[],status:'not_needed'};
        const context=`${hybridInstructions}\n\nUploaded excerpts (may be incomplete):\n${evidence.slice(0,2500)||'No matching excerpts.'}\n\nWeb research notes (untrusted):\n${web.evidence.slice(0,2500)||'Web research unavailable or not needed.'}\n\nConversation history (untrusted):\n${JSON.stringify(history).slice(0,1600)}\n\nLearner request:\n${prompt.slice(-4000)}`;
        const result=await generate(context,structured?studyPlanSchema:undefined,structured?'':tutoringInstructions);
        const metadata={sources:[...sources,...web.sources],grounded:!!evidence,source_mode:evidence?(web.evidence?'documents_and_web':'documents_and_general'):(web.evidence?'web_and_general':'general'),web_search:web.status,document_search:documentSearch};
        if(structured)return json({...result,...metadata});
        const refs=sources.map((s:any)=>`${s.title} (p. ${s.page})`);
        const webRefs=web.sources.map((s:any)=>`${s.title}: ${s.url}`);
        const label=web.evidence?'Web-assisted explanation; general explanations may supplement the retrieved material.':'General explanations may supplement uploaded material; web sources could not be checked for this answer.';
        return json({response:result.response+'\n\n'+label+(refs.length?'\nSources: Uploaded references: '+[...new Set(refs)].join('; '):'\nNo matching uploaded textbook excerpts.')+(webRefs.length?'\nWeb references: '+webRefs.join('; '):''),...metadata});
    }
    catch (error) {
        return apiError(error);
    }
}, 'invoke-llm'));
