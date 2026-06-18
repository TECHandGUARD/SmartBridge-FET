import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Chat Configuration Function
 * Fetches chat configuration settings from system_configurations table.
 * Used by AI chat components to load suggestions, welcome messages, and prompts.
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
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

    // Fetch all active system configurations
    const { data: configs, error: configsError } = await supabaseClient
      .from('system_configurations')
      .select('*')
      .eq('is_active', true);

    if (configsError) {
      throw new Error("Failed to fetch configurations: " + configsError.message);
    }

    // Helper function to get value by key
    const getVal = (key: string, fallback: any) => {
      const found = (configs || []).find((c: any) => c.key === key);
      return found ? found.value : fallback;
    };

    const suggestions = getVal('chat_suggestions', {
      items: [
        "What is the NBT and do I need it?",
        "What are the minimum requirements for UCT?",
        "How do I apply for NSFAS?",
        "What is the difference between APS and NBT score?",
        "When do university applications open?",
        "Which universities don't require the NBT?"
      ]
    });

    const welcomeMessage = getVal('chat_welcome_message', {
      text: "Hi! 👋 I'm your University & NBT AI Guide. I can help you with university applications, NBT preparation, bursaries, and career guidance.\n\nWhat would you like to know?"
    });

    const studyAssistantPrompts = getVal('study_assistant_quick_prompts', {
      items: [
        { label: 'Explain a concept', prompt: 'Explain the following CAPS concept in simple terms: ' },
        { label: 'Summarise notes', prompt: 'Summarise the following study notes in bullet points: ' },
        { label: 'Practice questions', prompt: 'Give me 5 practice exam questions (with answers) for CAPS on: ' },
        { label: 'Study tips', prompt: 'Give me top study tips and exam strategies for CAPS: ' }
      ]
    });

    return new Response(
      JSON.stringify({
        suggestions: suggestions.items || [],
        welcomeMessage: welcomeMessage.text || '',
        studyAssistantPrompts: studyAssistantPrompts.items || []
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Chat config error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});