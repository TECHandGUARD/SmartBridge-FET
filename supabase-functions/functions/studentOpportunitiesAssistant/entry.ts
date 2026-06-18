import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { message, grade, subject } = await req.json();

    const [configsResult, resourcesResult] = await Promise.all([
      supabaseClient
        .from("system_configurations")
        .select("*")
        .eq("is_active", true),
      supabaseClient
        .from("educational_resources")
        .select("*")
        .eq("is_active", true)
    ]);

    const configs = configsResult.data || [];
    const allResources = resourcesResult.data || [];

    const guardrailConfig = configs.find((c: any) => c.key === "master_tutor_guardrail");
    const guardrail = guardrailConfig?.value?.text ||
      "You are a strict South African educational assistant. Only answer questions related to education, university applications, NBT, bursaries, and career guidance. Politely decline any off-topic, harmful, or non-educational requests.";

    const relevantResources = allResources.filter((r: any) => {
      const gradeMatch = !grade || r.grade === grade || r.grade === "All Grades";
      const subjectMatch = !subject || r.subject === subject || r.subject === "All Subjects";
      return gradeMatch && subjectMatch && r.resource_url;
    }).slice(0, 6);

    const resourceContext = relevantResources.length > 0
      ? "\n\nCAPS Knowledge Base (use as primary reference):\n" + relevantResources.map((r: any) =>
          "- \"" + r.title + "\" [" + r.subject + ", " + r.grade + (r.caps_alignment_tag ? ", " + r.caps_alignment_tag : "") + "]: " + (r.description || "")
        ).join("\n")
      : "";

    const currentYear = new Date().getFullYear();

    const systemPrompt = guardrail + "\n\nYou are an expert South African university and NBT assistant for FET students (Grade 10-12). Current year: " + currentYear + ".\n\nYou help students with:\n- NBT tests (Academic Literacy, Quantitative Literacy, Mathematics)\n- University application processes and deadlines at South African universities\n- Course requirements, APS scores, and prospectus information\n- Bursaries and financial aid (NSFAS, Funza Lushaka, private bursaries)\n- Career guidance and faculty selection" + resourceContext + "\n\nIMPORTANT: Always return a JSON response with a 'reply' (string) and 'source_references' (array of {title, url, caps_alignment_tag}). Only include sources you actually referenced.";

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // ✅ FIXED: Correct Gemini URL
    const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + geminiApiKey;

    const fullPrompt = systemPrompt + "\n\nStudent question: " + message;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error("Gemini API error: " + errorText);
    }

    const geminiData = await geminiResponse.json();

    let reply = "I couldn't generate a response. Please try again.";
    let sourceReferences = [];

    // ✅ FIXED: Safe optional chaining
    if (geminiData.candidates && geminiData.candidates.length > 0) {
      const part = geminiData.candidates[0].content?.parts?.[0];
      if (part && part.text) {
        const rawReply = part.text;
        try {
          const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            reply = parsed.reply || rawReply;
            sourceReferences = parsed.source_references || [];
          } else {
            reply = rawReply;
          }
        } catch (_e) {
          reply = rawReply;
        }
      }
    }

    return new Response(
      JSON.stringify({
        reply: reply,
        source_references: sourceReferences
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});