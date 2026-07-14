import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("DB_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { subject, grade, topic, question_count = 5 } = await req.json();

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

    // Call Gemini AI
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${errorText}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

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
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});