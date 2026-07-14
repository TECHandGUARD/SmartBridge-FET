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

    const prompt = `
      Search for high-quality, freely available PDF guides and study resources for South African Grade 12 students preparing for tertiary education. Focus on:
      1. NBT (National Benchmark Test) preparation guides and practice papers
      2. South African university admission requirements guides
      3. Bursary and financial aid application guides (NSFAS, etc.)
      4. Career guidance resources for South African students
      5. General study tips and exam preparation for Matric/NSC

      For each resource found, provide:
      - title: string (clear descriptive title)
      - description: string (what the guide covers, 1-2 sentences)
      - external_link: string (direct URL to the PDF or webpage, must be a real URL)
      - category: one of "NBT Prep", "University Requirements", "Bursaries", "Career Guidance", "General"
      - source: string (organization or website that published it)

      Return a JSON object with a "guides" array containing at least 10 resources.
      Only include resources from reputable South African educational organizations, universities, or government bodies.
      Return ONLY valid JSON, no other text.
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

    let guides = [];
    try {
      const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                        textResponse.match(/\{\s*"guides"\s*:\s*\[[\s\S]*\]\s*\}/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : textResponse;
      const parsed = JSON.parse(jsonString);
      guides = parsed.guides || [];
      
      if (!Array.isArray(guides)) {
        guides = [];
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

    for (const g of guides) {
      const { data: existing } = await supabase
        .from("pending_opportunity_guides")
        .select("*")
        .eq("title", g.title)
        .eq("status", "pending");

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      const { error: insertError } = await supabase
        .from("pending_opportunity_guides")
        .insert({
          title: g.title,
          description: g.description || "",
          external_link: g.external_link || "",
          category: g.category || "General",
          status: "pending",
          source: g.source || "AI Discovery",
          created_at: new Date().toISOString()
        });

      if (!insertError) added++;
    }

    return new Response(
      JSON.stringify({ success: true, added, skipped, total: guides.length }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});