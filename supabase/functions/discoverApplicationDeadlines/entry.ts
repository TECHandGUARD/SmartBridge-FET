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
    const user = await authorize(req, supabase, 'admin');
    await consumeQuota(supabase,user.id,'ai');
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

    const { response: textResponse } = await generate(prompt);

    let deadlines = [];
    try {
      const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
                        textResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : textResponse;
      const parsed = JSON.parse(jsonString);
      deadlines = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.deadlines) ? parsed.deadlines : [];
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
      { status: error.status || 500, headers: { "Content-Type": "application/json" } }
    );
  }
}, 'discover-application-deadlines'));
