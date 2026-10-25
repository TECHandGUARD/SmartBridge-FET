import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dispatcher = readFileSync('supabase/functions/cooTutorOnboarding/entry.ts','utf8');
const migration = readFileSync('supabase/migrations/20261025203000_coo_tutor_onboarding.sql','utf8');
const scheduler = readFileSync('supabase/functions/runScheduledJob/entry.ts','utf8');
const webhook = readFileSync('supabase/functions/resendWebhook/entry.ts','utf8');
const config = readFileSync('supabase/config.toml','utf8');

test('default is dry-run and live sending requires explicit server configuration', () => {
 assert.match(dispatcher, /COO_EMAIL_ENABLED/);
 assert.match(dispatcher, /payload\?\.dry_run !== false/);
});
test('only active tutor roles qualify and first follow-up is no earlier than 48h',()=>{
 assert.match(dispatcher, /in\('role',\['student_tutor','sace_tutor','tutor'\]\)/);
 assert.match(dispatcher, /eq\('is_active',true\)/);
 assert.match(dispatcher, /hours<48/);
});
test('admin managed operational reminders still honor explicit user refusal',()=> {
 assert.match(dispatcher, /opt_out/);
 assert.match(dispatcher, /coo_issue_unsubscribe_token/);
 assert.match(dispatcher, /coo_reserve_email/);
});
test('quota and idempotency exist at DB level',()=>{
 assert.match(migration, /pg_advisory_xact_lock/);
 assert.match(migration, /v_count >= 25/);
 assert.match(migration, /unique\(tutor_id,campaign\)/);
 assert.match(migration, /revoke all on public\.coo_tutor_email_log from anon,authenticated/);
});
test('scheduler and signed delivery webhook include COO',()=>{
 assert.match(scheduler, /'coo-tutor-onboarding'/);
 assert.match(config, /\[functions\.coo-tutor-onboarding\]/);
 assert.match(webhook, /verifySignedWebhook/);
 assert.match(webhook, /coo_tutor_email_log/);
});

test('unsubscribe requires an explicit confirmed action',()=> {
 const endpoint=readFileSync('supabase/functions/cooReminderUnsubscribe/entry.ts','utf8');
 const optout=readFileSync('supabase/migrations/20261025223500_coo_admin_reminders_opt_out.sql','utf8');
 assert.match(endpoint,/request.method==='GET'/);
 assert.match(endpoint,/\['GET','POST'\]/);
 assert.match(optout,/coo_reminder_suppressions/);
 assert.match(optout,/coo_redeem_unsubscribe_token/);
});
