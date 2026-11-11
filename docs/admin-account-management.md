# Admin account management

## What the dashboard supports
- Admins can deactivate and reactivate learner, parent and tutor accounts.
- Permanent deletion is restricted to super-admins.
- An admin cannot manage their own account through this panel.
- Super-admin accounts are protected from deletion/deactivation through this workflow.
- Permanent deletion requires typing `DELETE` and is refused when the dependency check finds retained operational, financial, legal, communication, learning or audit-related records.
- Deactivation is reversible and retains the account profile and related records.

## Security model
The browser calls the `admin-manage-user` Supabase Edge Function. The function validates the caller's JWT, loads the caller's role from `public.users`, enforces super-admin restrictions for permanent deletion, and uses the service-role key only on the server. Never put the service-role key in Vite/client environment variables.

The SQL migration `20261111000000_admin_user_deletion_safety.sql` adds a security-definer dependency-check function. Execution is revoked from public/anon/authenticated and granted only to service_role. The Edge Function fails closed if the RPC is missing or returns an error.

## Deployment order
1. Review and apply the SQL migration to the intended Supabase project.
2. Deploy `supabase/functions/admin-manage-user/index.ts` with JWT verification enabled.
3. Confirm the Edge Function has the standard `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` secrets.
4. Deploy the frontend branch to a non-production preview and test with dedicated admin, super-admin and test accounts.
5. Verify deactivation blocks sign-in, reactivation restores sign-in, regular admins cannot permanently delete, and deletion is blocked for users with linked records.
6. Only after successful review should the branch be merged and production deployment considered.

## Important deletion behaviour
The dependency check currently covers the user identity columns present in the database schema reviewed for this change. It intentionally preserves audit history and legal/payment/booking records by blocking deletion where those records exist. If the check returns a linked table list, deactivate the account instead; do not manually delete those records to force deletion. Review future schema changes and add any new user-reference columns to the migration before enabling permanent deletion broadly.

## UI notes
The Admin Dashboard navigation is grouped for mobile use. The Users panel includes search across loaded records, role and account-status filters, status badges, and explicit account actions. Search/filtering applies to the currently loaded page batches; use Load More to extend the searchable records.
