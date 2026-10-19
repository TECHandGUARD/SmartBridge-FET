import { generate } from '../../shared/ai.ts';
import { retrieveLearningEvidence, groundedInstructions } from '../../shared/grounding.ts';
import {consumeQuota,readJson} from '../../shared/api.ts';
import { serverConnection } from "../../shared/config.ts";
import { withHttp, authorize } from "../../shared/http.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

serve(withHttp(async (req) => {
  try {
    const connection = serverConnection();
    const supabase = createClient(connection.url, connection.key, {auth:{persistSession:false, autoRefreshToken:false}});
    const user = await authorize(req, supabase, 'user');
    await consumeQuota(supabase,user.id,'ai');
    const { subject, grade, topic, question_count = 5 } = await readJson(req);
    if(typeof subject!=='string'||subject.length>100||typeof grade!=='string'||!['Grade 10','Grade 11','Grade 12'].includes(grade)||typeof topic!=='string'||topic.length>300||!Number.isInteger(question_count)||question_count<1||question_count>10)return new Response(JSON.stringify({error:'Invalid quiz parameters'}),{status:400,headers:{'Content-Type':'application/json'}});

    if (!subject || !grade || !topic) {
      return new Response(
        JSON.stringify({ error: "subject, grade, and topic are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const {evidence,sources}=await retrieveLearningEvidence(supabase,String(topic),String(subject),String(grade));
    if(!evidence)return new Response(JSON.stringify({error:'No indexed SmartBridge textbook excerpts found for this topic. Ask an administrator to index the uploaded PDFs.'}),{status:422,headers:{'Content-Type':'application/json'}});
    const guardrail=groundedInstructions;
    const resourceContext=evidence;

    const prompt = `${guardrail}

${resourceContext}

Generate a ${question_count}-question multiple choice quiz about "${topic}" for ${grade} ${subject} (CAPS curriculum, South Africa).

Rules:
- Each question must be clear, unambiguous, and grade-appropriate
- Each question must have exactly 4 options (A, B, C, D)
- The correct answer index is 0-based (0=A, 1=B, 2=C, 3=D)
- Each explanation must clearly explain WHY the correct answer is right
- Strictly follow CAPS curriculum scope for ${grade} ${subject}`;

    // Call server-configured Groq using retrieved, approved textbook excerpts
    const { response: textResponse } = await generate(prompt);

    let result = { questions: [], topic_summary: "" };
    try {
      const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
                        textResponse.match(/\{\s*"questions"\s*:\s*\[[\s\S]*\]\s*\}/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : textResponse;
      result = JSON.parse(jsonString);

      if (!result.questions || !Array.isArray(result.questions)) {
        result.questions = [];
      }
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          error: "Failed to parse AI response",
          message: 'Please try a more specific topic.'
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        questions: result.questions || [],
        topic_summary: result.topic_summary || "",
        resources_used: sources.map((r:any)=>({title:r.title,page:r.page}))
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status || 500, headers: { "Content-Type": "application/json" } }
    );
  }
}, 'generate-quiz'));
