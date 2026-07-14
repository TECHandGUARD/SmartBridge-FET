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

    const { message, prospectus_urls, grade, subject } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch guardrail config and relevant EducationalResources in parallel
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
      "You are a strict South African educational assistant. Only answer questions related to education, university applications, NBT, bursaries, and career guidance. Politely decline any off-topic, harmful, or non-educational requests.";

    // Filter resources: exact grade+subject first, then broader matches
    const relevantResources = resourcesData
      .filter((r: any) => {
        const gradeMatch = !grade || r.grade === grade || r.grade === "All Grades";
        const subjectMatch = !subject || r.subject === subject || r.subject === "All Subjects";
        return gradeMatch && subjectMatch && r.resource_url;
      })
      .slice(0, 6);

    const resourceContext = relevantResources.length > 0
      ? `\n\nCAPS Knowledge Base (use as primary reference):\n${relevantResources.map((r: any) =>
          `- "${r.title}" [${r.subject}, ${r.grade}${r.caps_alignment_tag ? ", " + r.caps_alignment_tag : ""}]: ${r.description || ""}`
        ).join("\n")}`
      : "";

    const currentYear = new Date().getFullYear();

    const systemPrompt = `${guardrail}

You are an expert South African university and NBT (National Benchmark Test) assistant for FET students (Grade 10-12). Current year: ${currentYear}.

You help students with:
- NBT tests (Academic Literacy, Quantitative Literacy, Mathematics)
- University application processes and deadlines at South African universities
- Course requirements, APS scores, and prospectus information
- Bursaries and financial aid (NSFAS, Funza Lushaka, private bursaries)
- Career guidance and faculty selection
${resourceContext}

IMPORTANT: Always return a JSON response with a 'reply' (string) and 'source_references' (array of {title, url, caps_alignment_tag} from the knowledge base above — only include sources you actually referenced).`;

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build the request to Gemini with JSON schema
    const promptWithSchema = `${systemPrompt}\n\nStudent question: ${message}

Return a JSON response with:
- reply: string (your response to the student)
- source_references: array of {title, url, caps_alignment_tag} from the knowledge base you referenced`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: promptWithSchema }]
          }],
          generationConfig: {
            temperature: 0.2,
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

    let result = { reply: "", source_references: [] };
    try {
      const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                        textResponse.match(/\{\s*"reply"\s*:\s*"/);
      let jsonString;
      if (jsonMatch) {
        jsonString = jsonMatch[1] || jsonMatch[0];
        // If it's a partial match, find the closing brace
        if (!jsonString.startsWith("{")) {
          const fullMatch = textResponse.match(/\{\s*"reply"\s*:\s*"[\s\S]*"\s*,\s*"source_references"\s*:\s*\[[\s\S]*\]\s*\}/);
          jsonString = fullMatch ? fullMatch[0] : textResponse;
        }
      } else {
        jsonString = textResponse;
      }
      result = JSON.parse(jsonString);
      
      if (!result.reply) {
        result.reply = textResponse;
        result.source_references = [];
      }
      if (!result.source_references || !Array.isArray(result.source_references)) {
        result.source_references = [];
      }
    } catch (parseError) {
      // If JSON parsing fails, return the text as a plain reply
      return new Response(
        JSON.stringify({
          reply: textResponse || "I couldn't generate a response. Please try again.",
          source_references: []
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Log the interaction in audit log (optional)
    await supabase
      .from("activity_log")
      .insert({
        event_type: "ai_assistant_query",
        user_email: user.email || "unknown",
        description: `Student opportunities assistant query`,
        metadata: JSON.stringify({
          subject,
          grade,
          message_length: message.length,
          reply_length: result.reply?.length || 0
        })
      });

    return new Response(
      JSON.stringify({
        reply: result.reply || "I couldn't generate a response. Please try again.",
        source_references: result.source_references || []
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in student opportunities assistant:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});