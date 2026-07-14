// =====================================================
// Supabase Edge Function: approve-opportunity-content
// Purpose: Approve or reject pending content
// Author: SmartBridge FET Migration
// Date: 2026-07-06
// =====================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Create Supabase client with service role key
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

    // Parse request body
    const { type, id, action, admin_notes } = await req.json();

    if (!type || !id || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, id, action" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Map types to tables
    const tableMap: Record<string, {
      pending: string;
      live: string;
      mapFields: (item: any) => Record<string, any>;
    }> = {
      deadline: {
        pending: "pending_application_deadlines",
        live: "application_deadlines",
        mapFields: (item: any) => ({
          event_name: item.event_name,
          university: item.university || "",
          date: item.date,
          description: item.description || "",
          link: item.link || "",
          category: item.category || "Other"
        })
      },
      guide: {
        pending: "pending_opportunity_guides",
        live: "opportunity_guides",
        mapFields: (item: any) => ({
          title: item.title,
          description: item.description || "",
          file_url: item.external_link || item.file_url || "",
          category: item.category || "General"
        })
      },
      prospectus: {
        pending: "pending_university_prospectuses",
        live: "university_prospectuses",
        mapFields: (item: any) => ({
          university_name: item.university_name,
          year: item.year,
          file_url: item.external_link || item.file_url || "",
          application_link: item.application_link || "",
          description: item.description || ""
        })
      }
    };

    const mapping = tableMap[type];
    if (!mapping) {
      return new Response(
        JSON.stringify({ error: "Invalid type. Must be: deadline, guide, or prospectus" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the pending item
    const { data: pendingItems, error: fetchError } = await supabase
      .from(mapping.pending)
      .select("*")
      .eq("id", id);

    if (fetchError || !pendingItems || pendingItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "Item not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const item = pendingItems[0];

    // Handle rejection
    if (action === "reject") {
      const { error: updateError } = await supabase
        .from(mapping.pending)
        .update({
          status: "rejected",
          admin_notes: admin_notes || "",
          rejected_at: new Date().toISOString(),
          rejected_by: user.id
        })
        .eq("id", id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, action: "rejected" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle approval
    if (action === "approve") {
      const liveData = mapping.mapFields(item);

      // Handle prospectus (update if exists)
      if (type === "prospectus") {
        const { data: existing } = await supabase
          .from(mapping.live)
          .select("*")
          .eq("university_name", item.university_name)
          .eq("year", item.year);

        if (existing && existing.length > 0) {
          const { error: updateError } = await supabase
            .from(mapping.live)
            .update({
              file_url: item.external_link || item.file_url || existing[0].file_url,
              application_link: item.application_link || existing[0].application_link || "",
              description: item.description || existing[0].description || "",
              updated_at: new Date().toISOString()
            })
            .eq("id", existing[0].id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from(mapping.live)
            .insert({
              ...liveData,
              is_approved: true,
              approved_at: new Date().toISOString(),
              approved_by: user.id,
              is_active: true
            });

          if (insertError) throw insertError;
        }
      } else {
        // Insert into live table for deadlines and guides
        const { error: insertError } = await supabase
          .from(mapping.live)
          .insert({
            ...liveData,
            is_active: true,
            is_approved: true,
            approved_at: new Date().toISOString(),
            approved_by: user.id
          });

        if (insertError) throw insertError;
      }

      // Update pending status
      const { error: updateError } = await supabase
        .from(mapping.pending)
        .update({
          status: "approved",
          admin_notes: admin_notes || "",
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq("id", id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, action: "approved" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Must be: approve or reject" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});