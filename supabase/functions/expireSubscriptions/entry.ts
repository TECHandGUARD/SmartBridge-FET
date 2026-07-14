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

    // Check if user is admin
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

    const today = new Date().toISOString().split('T')[0];

    // Get all active subscriptions
    const { data: activeSubs, error: subsError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("status", "active");

    if (subsError) {
      return new Response(
        JSON.stringify({ error: subsError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Filter expired subscriptions
    const expired = activeSubs?.filter(s => s.end_date && s.end_date < today) || [];

    // Update expired subscriptions to inactive
    let deactivated = 0;
    for (const s of expired) {
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ 
          status: "inactive",
          updated_at: new Date().toISOString()
        })
        .eq("id", s.id);

      if (!updateError) deactivated++;
    }

    return new Response(
      JSON.stringify({ 
        expired: expired.length,
        deactivated,
        message: `Deactivated ${deactivated} expired subscription(s).`
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