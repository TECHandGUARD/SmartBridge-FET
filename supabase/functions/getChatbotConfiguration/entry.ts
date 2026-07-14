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

    // Fetch all active system configurations
    const { data: configs, error: configsError } = await supabase
      .from("system_configuration")
      .select("*")
      .eq("is_active", true);

    if (configsError) {
      return new Response(
        JSON.stringify({ error: configsError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const getVal = (key: string, fallback: any) => {
      const found = configs?.find((c: any) => c.key === key);
      return found ? found.value : fallback;
    };

    const suggestions = getVal("chat_suggestions", {
      items: [
        "What is the NBT and do I need it?",
        "What are the minimum requirements for UCT?",
        "How do I apply for NSFAS?",
        "What is the difference between APS and NBT score?",
        "When do university applications open?",
        "Which universities don't require the NBT?"
      ]
    });

    const welcomeMessage = getVal("chat_welcome_message", {
      text: "Hi! 👋 I'm your University & NBT AI Guide. I can help you with university applications, NBT preparation, bursaries, and career guidance.\n\nWhat would you like to know?"
    });

    const studyAssistantPrompts = getVal("study_assistant_quick_prompts", {
      items: [
        { label: "Explain a concept", prompt: "Explain the following CAPS concept in simple terms: " },
        { label: "Summarise notes", prompt: "Summarise the following study notes in bullet points: " },
        { label: "Practice questions", prompt: "Give me 5 practice exam questions (with answers) for CAPS on: " },
        { label: "Study tips", prompt: "Give me top study tips and exam strategies for CAPS: " }
      ]
    });

    return new Response(
      JSON.stringify({
        suggestions: suggestions.items || [],
        welcomeMessage: welcomeMessage.text || "",
        studyAssistantPrompts: studyAssistantPrompts.items || []
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});