import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("DB_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

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

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const currentYear = new Date().getFullYear();
    const targetYear = currentYear + 1;

    const prompt = `
      Search for South African university application deadlines, NBT test registration dates, and bursary application deadlines for ${targetYear}.
      Include deadlines from major South African universities: UCT, Wits, Stellenbosch, UP, UKZN, UJ, UWC, Rhodes, NWU, UFH, UFS, UNISA, DUT, CPUT, TUT, VUT, MUT, CUT, WSU, SEFAKO MAKGATHO.
      Also include NBT (National Benchmark Test) registration and test dates for ${targetYear}.
      Also include major bursary deadlines from NSFAS, Funza Lushaka, and corporate bursaries.

      Return a JSON array of deadline objects. Each object must have:
      - event_name: string (descriptive name)
      - university: string (university name or "NBT" or "Various" for bursaries)
      - date: string in YYYY-MM-DD format
      - description: string (brief details)
      - link: string (official URL if found, else empty string)
      - category: one of "University Application", "NBT", "Bursary", "Other"
      - source: string (where you found the information)

      Return at least 15 deadlines covering different institutions and categories.
      Return ONLY the JSON array, no other text.
    `;

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

    let deadlines = [];
    try {
      const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                        textResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : textResponse;
      deadlines = JSON.parse(jsonString);
      
      if (deadlines.deadlines && Array.isArray(deadlines.deadlines)) {
        deadlines = deadlines.deadlines;
      }
      
      if (!Array.isArray(deadlines)) {
        deadlines = [];
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

    let added = 0;
    let skipped = 0;

    for (const d of deadlines) {
      const { data: existing } = await supabase
        .from("pending_application_deadlines")
        .select("*")
        .eq("event_name", d.event_name)
        .eq("status", "pending");

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      const { error: insertError } = await supabase
        .from("pending_application_deadlines")
        .insert({
          event_name: d.event_name,
          university: d.university || "",
          date: d.date,
          description: d.description || "",
          link: d.link || "",
          category: d.category || "Other",
          status: "pending",
          source: d.source || "AI Discovery",
          created_at: new Date().toISOString()
        });

      if (!insertError) added++;
    }

    return new Response(
      JSON.stringify({ success: true, added, skipped, total: deadlines.length }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});