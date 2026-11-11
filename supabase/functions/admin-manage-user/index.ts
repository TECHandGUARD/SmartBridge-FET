import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

// Each reference below is checked before deletion. The service-role client is
// used only inside this function; no privileged key is exposed to the browser.
const protectedReferences: Array<{ table: string; column: string; value: "id" | "email" }> = [
  { table: "account_deletion_requests", column: "user_id", value: "id" },
  { table: "adult_call_push_subscriptions", column: "user_id", value: "id" },
  { table: "application_documents", column: "student_email", value: "email" },
  { table: "banner_clicks", column: "user_id", value: "id" },
  { table: "banner_clicks", column: "user_email", value: "email" },
  { table: "legal_acceptances", column: "user_id", value: "id" },
  { table: "payment_orders", column: "user_id", value: "id" },
  { table: "peer_study_call_members", column: "user_id", value: "id" },
  { table: "presentation_decks", column: "owner_id", value: "id" },
  { table: "resource_bookmarks", column: "user_id", value: "id" },
  { table: "resource_bookmarks", column: "user_email", value: "email" },
  { table: "resource_ratings", column: "user_id", value: "id" },
  { table: "resource_ratings", column: "user_email", value: "email" },
  { table: "staff_accounts", column: "user_id", value: "id" },
  { table: "student_notes", column: "student_email", value: "email" },
  { table: "student_notes", column: "tutor_email", value: "email" },
  { table: "subscriptions", column: "user_id", value: "id" },
  { table: "subscriptions", column: "user_email", value: "email" },
  { table: "study_room_memberships", column: "user_id", value: "id" },
  { table: "study_room_reactions", column: "user_id", value: "id" },
  { table: "tutor_availability", column: "tutor_email", value: "email" },
  { table: "tutor_bookings", column: "student_email", value: "email" },
  { table: "tutor_bookings", column: "tutor_email", value: "email" },
  { table: "tutor_directory", column: "user_id", value: "id" },
  { table: "tutor_directory", column: "user_email", value: "email" },
  { table: "tutor_payouts", column: "tutor_email", value: "email" },
  { table: "tutor_profiles", column: "user_id", value: "id" },
  { table: "tutor_profiles", column: "user_email", value: "email" },
  { table: "tutor_reviews", column: "student_email", value: "email" },
  { table: "tutor_reviews", column: "tutor_email", value: "email" },
  { table: "user_consents", column: "user_id", value: "id" },
  { table: "user_profiles", column: "email", value: "email" },
  { table: "virtual_meeting_participants", column: "user_id", value: "id" },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!url || !anonKey || !serviceKey || !authHeader) return json({ error: "Server authentication is not configured." }, 500);

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "A valid signed-in session is required." }, 401);

  let body: { action?: string; targetUserId?: string; confirmation?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }
  const { action, targetUserId, confirmation } = body;
  if (!targetUserId || !["deactivate", "reactivate", "delete"].includes(action || "")) return json({ error: "Choose a valid account action and target." }, 400);

  const { data: actor, error: actorError } = await adminClient.from("users").select("id,email,role,is_super_admin").eq("id", authData.user.id).maybeSingle();
  if (actorError || !actor || (actor.role !== "admin" && actor.is_super_admin !== true)) return json({ error: "Administrator access is required." }, 403);
  if (actor.id === targetUserId) return json({ error: "You cannot change or delete your own account here." }, 400);

  const { data: target, error: targetError } = await adminClient.from("users").select("id,email,full_name,role,is_super_admin,is_active").eq("id", targetUserId).maybeSingle();
  if (targetError || !target) return json({ error: "The selected account could not be found." }, 404);
  if (target.is_super_admin) return json({ error: "Super-admin accounts are protected from these actions." }, 403);
  if (target.role === "admin" && actor.is_super_admin !== true) return json({ error: "Only a super-admin can manage another administrator." }, 403);
  if (action === "delete" && actor.is_super_admin !== true) return json({ error: "Permanent deletion is restricted to super-admins." }, 403);

  if (action === "deactivate" || action === "reactivate") {
    const active = action === "reactivate";
    const { error } = await adminClient.from("users").update({ is_active: active, updated_at: new Date().toISOString() }).eq("id", targetUserId);
    if (error) return json({ error: "The account status could not be updated." }, 500);
    const { error: logError } = await adminClient.from("activity_log").insert({
      event_type: active ? "user_reactivated_by_admin" : "user_deactivated_by_admin",
      user_email: actor.email,
      user_id: actor.id,
      description: `${active ? "Reactivated" : "Deactivated"} account ${target.email} (${target.id})`,
      metadata: { target_user_id: target.id, target_email: target.email, action },
    });
    if (logError) console.error("Account action audit log failed:", logError);
    return json({ success: true, message: active ? "Account reactivated." : "Account deactivated." });
  }

  if (confirmation !== "DELETE") return json({ error: "Permanent deletion requires the exact confirmation phrase." }, 400);

  const blockers: string[] = [];
  for (const ref of protectedReferences) {
    const value = ref.value === "id" ? target.id : target.email;
    const { count, error } = await adminClient.from(ref.table).select("*", { count: "exact", head: true }).eq(ref.column, value);
    if (error) {
      // Fail closed: a failed reference check must never be interpreted as safe to delete.
      console.error("Unable to verify deletion dependency:", ref.table, ref.column, error);
      return json({ error: "Deletion safety checks could not be completed. No data was deleted; contact the technical administrator." }, 503);
    }
    if ((count || 0) > 0 && !blockers.includes(ref.table)) blockers.push(ref.table);
  }
  if (blockers.length) return json({
    error: "This account has linked records that must be retained or handled before permanent deletion.",
    blocked: true,
    linkedRecords: blockers,
    message: "Deactivate the account instead, or complete an approved data-retention and anonymisation review first.",
  }, 409);

  const { error: auditError } = await adminClient.from("activity_log").insert({
    event_type: "user_permanently_deleted_by_admin",
    user_email: actor.email,
    user_id: actor.id,
    description: `Permanently deleted account ${target.email} (${target.id})`,
    metadata: { target_user_id: target.id, target_email: target.email, action: "delete" },
  });
  if (auditError) return json({ error: "The audit record could not be written. Deletion was cancelled." }, 500);

  // Remove the authentication identity first. If profile cleanup then fails,
  // the account can no longer sign in and the failure is visible to operators.
  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(target.id);
  if (authDeleteError) return json({ error: "The authentication account could not be deleted. No profile data was removed." }, 500);

  const { error: profileDeleteError } = await adminClient.from("users").delete().eq("id", target.id);
  if (profileDeleteError) {
    console.error("Auth identity deleted but profile row cleanup failed:", profileDeleteError);
    return json({ error: "The login was deleted, but profile cleanup failed. Contact the technical administrator with the account ID.", partial: true, accountId: target.id }, 500);
  }
  return json({ success: true, message: "Account permanently deleted. The administrative audit record was retained." });
});
