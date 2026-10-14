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

    const { response: textResponse } = await generate(prompt);

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
      { status: error.status || 500, headers: { "Content-Type": "application/json" } }
    );
  }
}, 'discover-opportunity-guides'));
