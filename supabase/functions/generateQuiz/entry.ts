import { generate } from '../../shared/ai.ts';
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

    if (!subject || !grade || !topic) {
      return new Response(
        JSON.stringify({ error: "subject, grade, and topic are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch guardrail and relevant resources in parallel
    const [configs, allResources] = await Promise.all([
      supabase
        .from("system_configuration")
        .select("*")
        .eq("is_active", true),
      supabase
        .from("educational_resources")
        .select("*")
        .eq("is_active", true)
    ]);

    const configData = configs.data || [];
    const resourcesData = allResources.data || [];

    const guardrailConfig = configData.find((c: any) => c.key === "master_tutor_guardrail");
    const guardrail = guardrailConfig?.value?.text ||
      "You are a strict South African CAPS curriculum tutor. Only generate content that is factually correct, educationally appropriate, and aligned with the CAPS syllabus. Reject any non-educational content.";

    // Filter resources for this subject/grade, prioritize exact matches then broader
    const matchedResources = resourcesData
      .filter((r: any) =>
        (r.subject === subject || r.subject === "All Subjects") &&
        (r.grade === grade || r.grade === "All Grades") &&
        r.resource_url
      )
      .slice(0, 5);

    const resourceContext = matchedResources.length > 0
      ? `Use the following CAPS-aligned resources as your primary source:\n${matchedResources.map((r: any) =>
          `- "${r.title}" (${r.caps_alignment_tag || topic}): ${r.description || ""} [URL: ${r.resource_url}]`
        ).join("\n")}`
      : `No uploaded resources found. Generate based on the official CAPS curriculum for ${subject}, ${grade}.`;

    const prompt = `${guardrail}

${resourceContext}

Generate a ${question_count}-question multiple choice quiz about "${topic}" for ${grade} ${subject} (CAPS curriculum, South Africa).

Rules:
- Each question must be clear, unambiguous, and grade-appropriate
- Each question must have exactly 4 options (A, B, C, D)
- The correct answer index is 0-based (0=A, 1=B, 2=C, 3=D)
- Each explanation must clearly explain WHY the correct answer is right
- Strictly follow CAPS curriculum scope for ${grade} ${subject}`;

    // Call the server-configured OpenAI provider
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
          error: "Failed to parse Gemini response",
          raw_response: textResponse
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        questions: result.questions || [],
        topic_summary: result.topic_summary || "",
        resources_used: matchedResources.map((r: any) => ({
          title: r.title,
          url: r.resource_url
        }))
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
