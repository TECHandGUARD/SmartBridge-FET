-- R0 Marketing & Growth Hub — manual SQL security verification
-- Run ONLY against an isolated disposable Supabase test project after applying
-- the draft migration. These checks intentionally do not insert real customer data.
-- Execute each role scenario with Supabase JWT claims configured for that identity.

-- A. Confirm the R0 guardrail is present and defaults to zero / disabled.
select monthly_budget_zar, paid_campaigns_enabled
from smartbridge_private.marketing_budget_control where id=true;
-- Expected: 0.00 | false

-- B. Anonymous role must not read leads.
set local role anon;
select count(*) from public.tech_guard_leads;
-- Expected: permission denied or RLS-filtered zero rows.
reset role;

-- C. Ordinary authenticated user must not read/update leads.
-- Replace the UUID with a disposable ordinary test account.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select count(*) from public.tech_guard_leads;
-- Expected: zero rows.
reset role;

-- D. Anonymous intake remains available (use synthetic details only).
set local role anon;
insert into public.tech_guard_leads(name,email,message,source_channel)
values ('Synthetic QA','qa@example.invalid','Synthetic R0 lead test','website');
-- Expected: one inserted row; never use real personal information in this test.
reset role;

-- E. Ordinary users cannot change the budget or call the private lead activity function.
set local role authenticated;
select public.set_marketing_budget_control(100,true,'test approval must be rejected');
-- Expected: exception: Active full administrator required.
reset role;

-- F. Full admin can view lead inbox, inspect history, and update through the RPC.
-- Configure the disposable admin JWT before these calls.
-- select * from public.tech_guard_leads order by created_at desc limit 10;
-- select public.manage_tech_guard_lead('<synthetic-lead-uuid>','status_changed',null,'contacted');
-- select * from public.tech_guard_lead_activity('<synthetic-lead-uuid>');

-- G. Confirm a zero budget cannot enable paid campaigns, even for an admin.
-- select public.set_marketing_budget_control(0,true,'invalid zero-budget activation');
-- Expected: exception: Paid campaigns must remain disabled at R0.

-- H. Confirm ordinary authenticated users cannot execute private activity writer.
-- select smartbridge_private.record_tech_guard_lead_activity('<synthetic-lead-uuid>','note_added','unauthorized',null);
-- Expected: permission denied.
