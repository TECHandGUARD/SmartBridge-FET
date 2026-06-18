import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Review Pending Content Function
 * Handles admin approval/rejection of pending content (deadlines, guides, prospectuses).
 * Used by Admin Dashboard to moderate AI-discovered content.
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

    // Parse request body
    const { type, id, action, admin_notes } = await req.json();

    if (!type || !id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, id, action' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map types to table names
    const tableMap: Record<string, string> = {
      deadline: 'pending_application_deadlines',
      guide: 'pending_opportunity_guides',
      prospectus: 'pending_university_prospectuses'
    };

    const liveTableMap: Record<string, string> = {
      deadline: 'application_deadlines',
      guide: 'opportunity_guides',
      prospectus: 'university_prospectuses'
    };

    const pendingTable = tableMap[type];
    const liveTable = liveTableMap[type];

    if (!pendingTable || !liveTable) {
      return new Response(
        JSON.stringify({ error: 'Invalid type. Must be: deadline, guide, or prospectus' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the pending item
    const { data: pendingItems, error: fetchError } = await supabaseClient
      .from(pendingTable)
      .select('*')
      .eq('id', id);

    if (fetchError) {
      throw new Error("Failed to fetch item: " + fetchError.message);
    }

    if (!pendingItems || pendingItems.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Item not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const item = pendingItems[0];

    // Handle rejection
    if (action === 'reject') {
      const { error: updateError } = await supabaseClient
        .from(pendingTable)
        .update({
          status: 'rejected',
          admin_notes: admin_notes || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        throw new Error("Failed to reject item: " + updateError.message);
      }

      return new Response(
        JSON.stringify({ success: true, action: 'rejected' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle approval
    if (action === 'approve') {
      let liveData: any = {};

      // Prepare data for live table based on type
      if (type === 'deadline') {
        liveData = {
          event_name: item.event_name,
          university: item.university || '',
          date: item.date,
          description: item.description || '',
          link: item.link || '',
          category: item.category || 'Other',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      } else if (type === 'guide') {
        liveData = {
          title: item.title,
          description: item.description || '',
          file_url: item.external_link || item.file_url || '',
          category: item.category || 'General',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      } else if (type === 'prospectus') {
        // Check if prospectus already exists for this university/year
        const { data: existing } = await supabaseClient
          .from(liveTable)
          .select('*')
          .eq('university_name', item.university_name)
          .eq('year', item.year);

        if (existing && existing.length > 0) {
          // Update existing
          const { error: updateError } = await supabaseClient
            .from(liveTable)
            .update({
              file_url: item.external_link || item.file_url || existing[0].file_url,
              application_link: item.application_link || existing[0].application_link || '',
              description: item.description || existing[0].description || '',
              updated_at: new Date().toISOString()
            })
            .eq('id', existing[0].id);

          if (updateError) {
            throw new Error("Failed to update prospectus: " + updateError.message);
          }
        } else {
          // Insert new
          liveData = {
            university_name: item.university_name,
            year: item.year,
            file_url: item.external_link || item.file_url || '',
            application_link: item.application_link || '',
            description: item.description || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
      }

      // Insert to live table (if not prospectus or if prospectus didn't exist)
      if (type !== 'prospectus' || !liveData.id) {
        const { error: insertError } = await supabaseClient
          .from(liveTable)
          .insert([liveData]);

        if (insertError) {
          throw new Error("Failed to approve item: " + insertError.message);
        }
      }

      // Update pending item status
      const { error: updateError } = await supabaseClient
        .from(pendingTable)
        .update({
          status: 'approved',
          admin_notes: admin_notes || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        throw new Error("Failed to update pending item: " + updateError.message);
      }

      return new Response(
        JSON.stringify({ success: true, action: 'approved' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Must be: approve or reject' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Review pending content error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});