import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Discover Guides Function
 * Uses Gemini AI to search for South African educational guides and resources.
 * Used by Admin to discover and add new guides to the library.
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
    let guides: any[] = [];

    if (geminiData.candidates && geminiData.candidates.length > 0) {
      const rawReply = geminiData.candidates[0].content.parts[0].text;
      try {
        const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          guides = parsed.guides || [];
        }
      } catch (_e) {
        console.error('Failed to parse Gemini response as JSON');
      }
    }

    let added = 0;
    let skipped = 0;

    for (const g of guides) {
      // Check if already exists
      const { data: existing, error: existingError } = await supabaseClient
        .from('pending_opportunity_guides')
        .select('id')
        .eq('title', g.title)
        .eq('status', 'pending');

      if (existingError) {
        console.error('Error checking existing:', existingError);
        continue;
      }

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      // Insert new guide
      const { error: insertError } = await supabaseClient
        .from('pending_opportunity_guides')
        .insert({
          title: g.title,
          description: g.description || '',
          external_link: g.external_link || '',
          category: g.category || 'General',
          status: 'pending',
          source: g.source || 'AI Discovery',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error inserting guide:', insertError);
      } else {
        added++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        added, 
        skipped, 
        total: guides.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Discover guides error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});