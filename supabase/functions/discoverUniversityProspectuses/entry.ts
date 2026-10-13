import {consumeQuota,readJson} from '../../shared/api.ts';
import { serverConnection, geminiSettings } from "../../shared/config.ts";
import { withHttp, authorize } from "../../shared/http.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

serve(withHttp(async (req) => {
  try {
    const connection = serverConnection();
    const supabase = createClient(connection.url, connection.key, {auth:{persistSession:false, autoRefreshToken:false}});
    const user = await authorize(req, supabase, 'admin');
    await consumeQuota(supabase,user.id,'ai');
    const { data: universities, error: uniError } = await supabase
      .from("universities")
      .select("*")
      .eq("is_active", true);

    if (uniError || !universities || universities.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No universities found in database. Please run the universities migration SQL."
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const currentYear = new Date().getFullYear();
    const targetYear = currentYear + 1;

    const universityList = universities.map((u: any) =>
      `- ${u.name} (website: ${u.website})`
    ).join('\n');

    const prompt = `
      Search for the official undergraduate prospectus PDF documents for ${targetYear} from these South African universities:
      ${universityList}

      For each university, find:
      - The direct URL to the ${targetYear} prospectus PDF (or the prospectus download page if direct PDF not available)
      - The direct URL to the online application portal

      Return a JSON object with a "prospectuses" array. Each item must have:
      - university_name: string (full name as listed above)
      - year: number (${targetYear})
      - external_link: string (direct PDF URL or download page URL - must be a real URL from the university's official website)
      - application_link: string (URL to the online application portal)
      - description: string (brief description of what the prospectus covers)
      - source: string (how you found this)

      Only include universities where you found actual prospectus URLs. Do NOT make up URLs.
      Return ONLY valid JSON, no other text.
    `;

    const { url: geminiUrl, apiKey: geminiApiKey } = geminiSettings();

    const geminiResponse = await fetch(
      geminiUrl,
      {
        signal: AbortSignal.timeout(25000),
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiApiKey },
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

    let prospectuses = [];
    try {
      const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
                        textResponse.match(/\{\s*"prospectuses"\s*:\s*\[[\s\S]*\]\s*\}/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : textResponse;
      const parsed = JSON.parse(jsonString);
      prospectuses = parsed.prospectuses || [];

      if (!Array.isArray(prospectuses)) {
        prospectuses = [];
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

    // ============================================================
    // SOFTCODED: Use university data from database for validation
    // ============================================================
    const validUniversityNames = universities.map((u: any) => u.name);

    for (const p of prospectuses) {
      // Skip if university name is not in our database
      if (!validUniversityNames.includes(p.university_name)) {
        skipped++;
        continue;
      }

      // Skip if URLs don't match the university domain
      const uni = universities.find((u: any) => u.name === p.university_name);
      if (uni && p.external_link) {
        try {
          const url = new URL(p.external_link);
          if (!url.hostname.includes(uni.domain || uni.website)) {
            skipped++;
            continue;
          }
        } catch {
          skipped++;
          continue;
        }
      }

      // Check for duplicates
      const { data: existing } = await supabase
        .from("pending_university_prospectuses")
        .select("*")
        .eq("university_name", p.university_name)
        .eq("year", targetYear)
        .eq("status", "pending");

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      const { error: insertError } = await supabase
        .from("pending_university_prospectuses")
        .insert({
          university_name: p.university_name,
          year: p.year || targetYear,
          external_link: p.external_link || "",
          application_link: p.application_link || "",
          description: p.description || "",
          status: "pending",
          source: p.source || "AI Discovery",
          created_at: new Date().toISOString()
        });

      if (!insertError) added++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        added,
        skipped,
        total: prospectuses.length,
        universities_found: universities.length
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status || 500, headers: { "Content-Type": "application/json" } }
    );
  }
}, 'discover-university-prospectuses'));
