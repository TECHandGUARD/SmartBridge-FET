import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SA_UNIVERSITIES = [
  { name: "University of Cape Town (UCT)", short: "UCT", website: "uct.ac.za" },
  { name: "University of the Witwatersrand (Wits)", short: "Wits", website: "wits.ac.za" },
  { name: "Stellenbosch University", short: "SU", website: "sun.ac.za" },
  { name: "University of Pretoria (UP)", short: "UP", website: "up.ac.za" },
  { name: "University of KwaZulu-Natal (UKZN)", short: "UKZN", website: "ukzn.ac.za" },
  { name: "University of Johannesburg (UJ)", short: "UJ", website: "uj.ac.za" },
  { name: "University of the Western Cape (UWC)", short: "UWC", website: "uwc.ac.za" },
  { name: "Rhodes University", short: "Rhodes", website: "ru.ac.za" },
  { name: "North-West University (NWU)", short: "NWU", website: "nwu.ac.za" },
  { name: "University of Fort Hare (UFH)", short: "UFH", website: "ufh.ac.za" },
  { name: "University of the Free State (UFS)", short: "UFS", website: "ufs.ac.za" },
  { name: "UNISA", short: "UNISA", website: "unisa.ac.za" },
  { name: "Durban University of Technology (DUT)", short: "DUT", website: "dut.ac.za" },
  { name: "Cape Peninsula University of Technology (CPUT)", short: "CPUT", website: "cput.ac.za" },
  { name: "Tshwane University of Technology (TUT)", short: "TUT", website: "tut.ac.za" }
];

/**
 * Discover Prospectuses Function
 * Uses Gemini AI to search for university prospectus PDFs and application links.
 * Used by Admin to discover and add new prospectuses to the library.
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

    const universityList = SA_UNIVERSITIES.map(u => `- ${u.name} (website: ${u.website})`).join('\n');

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
    let prospectuses: any[] = [];

    if (geminiData.candidates && geminiData.candidates.length > 0) {
      const rawReply = geminiData.candidates[0].content.parts[0].text;
      try {
        const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          prospectuses = parsed.prospectuses || [];
        }
      } catch (_e) {
        console.error('Failed to parse Gemini response as JSON');
      }
    }

    let added = 0;
    let skipped = 0;

    for (const p of prospectuses) {
      // Check if already exists
      const { data: existing, error: existingError } = await supabaseClient
        .from('pending_university_prospectuses')
        .select('id')
        .eq('university_name', p.university_name)
        .eq('year', targetYear)
        .eq('status', 'pending');

      if (existingError) {
        console.error('Error checking existing:', existingError);
        continue;
      }

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      // Insert new prospectus
      const { error: insertError } = await supabaseClient
        .from('pending_university_prospectuses')
        .insert({
          university_name: p.university_name,
          year: p.year || targetYear,
          external_link: p.external_link || '',
          application_link: p.application_link || '',
          description: p.description || '',
          status: 'pending',
          source: p.source || 'AI Discovery',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error inserting prospectus:', insertError);
      } else {
        added++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        added, 
        skipped, 
        total: prospectuses.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Discover prospectuses error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});