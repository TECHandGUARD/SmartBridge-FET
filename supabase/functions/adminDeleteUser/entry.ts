import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { serverConnection } from "../../shared/config.ts";
import { authorize, withHttp, failure } from "../../shared/http.ts";
import { readJson, json, apiError } from "../../shared/api.ts";

serve(withHttp(async (request) => {
  try {
    const { url, key } = serverConnection();
    const adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const actor = await authorize(request, adminClient, "admin");
    const body = await readJson(request);
    const targetId = typeof body.target_user_id === "string" ? body.target_user_id.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
      failure(400, "A valid target account is required");
    }
    if (reason.length < 10 || reason.length > 1000) {
      failure(400, "Provide a deletion reason between 10 and 1000 characters");
    }
    if (targetId === actor.id) failure(403, "You cannot delete your own administrator account");

    const { data: target, error: targetError } = await adminClient
      .from("users")
      .select("id,email,role,is_super_admin,is_active")
      .eq("id", targetId)
      .maybeSingle();
    if (targetError) failure(503, "Target account could not be checked");
    if (!target) failure(404, "The target account no longer exists");
    if (target.role === "admin" || target.is_super_admin === true) {
      failure(403, "Administrator and super-administrator accounts are protected from this action");
    }

    const { data: audit, error: auditError } = await adminClient
      .from("admin_account_deletion_audit")
      .insert({
        actor_user_id: actor.id,
        target_user_id: target.id,
        target_email: target.email || "",
        target_role: target.role || "unknown",
        reason,
        outcome: "started",
      })
      .select("id")
      .single();
    if (auditError || !audit?.id) failure(503, "Deletion audit could not be recorded; no account was deleted");

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(target.id);
    if (deleteError) {
      await adminClient.from("admin_account_deletion_audit")
        .update({ outcome: "failed", outcome_note: "Auth deletion failed", completed_at: new Date().toISOString() })
        .eq("id", audit.id);
      failure(409, "The account could not be deleted. Check linked records and resolve any retention or legal hold first");
    }

    await adminClient.from("admin_account_deletion_audit")
      .update({ outcome: "deleted", completed_at: new Date().toISOString() })
      .eq("id", audit.id);

    return json({ success: true, deleted_user_id: target.id, audit_id: audit.id });
  } catch (error) {
    return apiError(error);
  }
}, "admin-delete-user"));
