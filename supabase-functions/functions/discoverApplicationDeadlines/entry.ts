import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Discover Deadlines Function
 * Uses Gemini AI to search for university application deadlines, NBT dates, and bursary deadlines.
 * Used by Admin to discover and add new deadlines to the library.
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
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

    // Check if user is admin
    const userRole = user.app_metadata?.role || user.user_metadata?.role;
    if (userRole !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      - date: string in YYYY-MM-DD format (best estimate if exact date not confirmed yet)
      - description: string (brief details)
      - link: string (official URL if found, else empty string)
      - category: one of "University Application", "NBT", "Bursary", "Other"
      - source: string (where you found the information)

      Return at least 15 deadlines covering different institutions and categories.
      Return ONLY the JSON array, no other text.
    `;

    // Call Gemini API
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error("Gemini API error: " + errorText);
    }

    const geminiData = await geminiResponse.json();
    let deadlines: any[] = [];

    if (geminiData.candidates && geminiData.candidates.length > 0) {
      const rawReply = geminiData.candidates[0].content.parts[0].text;
      try {
        const jsonMatch = rawReply.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          deadlines = parsed;
        }
      } catch (_e) {
        console.error('Failed to parse Gemini response as JSON');
      }
    }

    let added = 0;
    let skipped = 0;

    for (const d of deadlines) {
      // Check if already exists
      const { data: existing, error: existingError } = await supabaseClient
        .from('pending_application_deadlines')
        .select('id')
        .eq('event_name', d.event_name)
        .eq('status', 'pending');

      if (existingError) {
        console.error('Error checking existing:', existingError);
        continue;
      }

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      // Insert new deadline
      const { error: insertError } = await supabaseClient
        .from('pending_application_deadlines')
        .insert({
          event_name: d.event_name,
          university: d.university || '',
          date: d.date,
          description: d.description || '',
          link: d.link || '',
          category: d.category || 'Other',
          status: 'pending',
          source: d.source || 'AI Discovery',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error inserting deadline:', insertError);
      } else {
        added++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        added, 
        skipped, 
        total: deadlines.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Discover deadlines error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});