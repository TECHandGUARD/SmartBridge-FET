import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Generate Quiz Function
 * Generates CAPS-aligned multiple choice quizzes using Gemini AI.
 * Used by the Quiz Builder feature.
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get user from JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { subject, grade, topic, question_count = 5 } = await req.json();

    if (!subject || !grade || !topic) {
      return new Response(
        JSON.stringify({ error: 'subject, grade, and topic are required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch guardrail and relevant resources in parallel
    const [configsResult, resourcesResult] = await Promise.all([
      supabaseClient
        .from('system_configurations')
        .select('*')
        .eq('is_active', true),
      supabaseClient
        .from('educational_resources')
        .select('*')
        .eq('is_active', true)
    ]);

    const configs = configsResult.data || [];
    const allResources = resourcesResult.data || [];

    const guardrailConfig = configs.find((c: any) => c.key === 'master_tutor_guardrail');
    const guardrail = guardrailConfig?.value?.text ||
      'You are a strict South African CAPS curriculum tutor. Only generate content that is factually correct, educationally appropriate, and aligned with the CAPS syllabus. Reject any non-educational content.';

    // Filter resources for this subject/grade
    const matchedResources = allResources.filter((r: any) =>
      (r.subject === subject || r.subject === 'All Subjects') &&
      (r.grade === grade || r.grade === 'All Grades') &&
      r.resource_url
    ).slice(0, 5);

    const resourceContext = matchedResources.length > 0
      ? `Use the following CAPS-aligned resources as your primary source:\n${matchedResources.map((r: any) =>
          `- "${r.title}" (${r.caps_alignment_tag || topic}): ${r.description || ''} [URL: ${r.resource_url}]`
        ).join('\n')}`
      : `No uploaded resources found. Generate based on the official CAPS curriculum for ${subject}, ${grade}.`;

    const prompt = `${guardrail}

${resourceContext}

Generate a ${question_count}-question multiple choice quiz about "${topic}" for ${grade} ${subject} (CAPS curriculum, South Africa).

Rules:
- Each question must be clear, unambiguous, and grade-appropriate
- Each question must have exactly 4 options (A, B, C, D)
- The correct answer index is 0-based (0=A, 1=B, 2=C, 3=D)
- Each explanation must clearly explain WHY the correct answer is right
- Strictly follow CAPS curriculum scope for ${grade} ${subject}

Return a JSON response with 'questions' array and 'topic_summary' string.`;

    // Call Gemini API
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    const fullPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no extra text.`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error("Gemini API error: " + errorText);
    }

    const geminiData = await geminiResponse.json();

    let questions: any[] = [];
    let topic_summary = '';

    if (geminiData.candidates && geminiData.candidates.length > 0) {
      const rawReply = geminiData.candidates[0].content.parts[0].text;
      try {
        const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          questions = parsed.questions || [];
          topic_summary = parsed.topic_summary || '';
        }
      } catch (_e) {
        console.error('Failed to parse Gemini response as JSON');
      }
    }

    return new Response(
      JSON.stringify({
        questions: questions,
        topic_summary: topic_summary,
        resources_used: matchedResources.map((r: any) => ({ 
          title: r.title, 
          url: r.resource_url 
        }))
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Generate quiz error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});