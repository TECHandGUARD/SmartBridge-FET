import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');

test('admin account management Edge Function is registered with JWT verification', () => {
  const manifest = JSON.parse(read('supabase/deployment-map.json'));
  const fn = manifest.functions.find(item => item.slug === 'admin-manage-user');
  assert.ok(fn, 'deployment map must include admin-manage-user');
  assert.equal(fn.verify_jwt, true);
  assert.ok(fn.required_migrations.includes('supabase/migrations/20261111000000_admin_user_deletion_safety.sql'));
  const config = read('supabase/config.toml');
  assert.match(config, /\[functions\.admin-manage-user\][\s\S]*?verify_jwt = true[\s\S]*?entrypoint = "\.\/functions\/admin-manage-user\/entry\.ts"/);
});

test('server-side account actions enforce database roles, self-protection and typed deletion confirmation', () => {
  const source = read('supabase/functions/admin-manage-user/entry.ts');
  assert.match(source, /auth\.getUser\(\)/);
  assert.match(source, /actor\.role !== "admin" && actor\.is_super_admin !== true/);
  assert.match(source, /actor\.id === targetUserId/);
  assert.match(source, /action === "delete" && actor\.is_super_admin !== true/);
  assert.match(source, /confirmation !== "DELETE"/);
  assert.match(source, /ban_duration: active \? "none" : "876000h"/);
  assert.match(source, /admin_user_deletion_blockers/);
  assert.match(source, /auth\.admin\.deleteUser/);
});

test('deletion dependency RPC is server-only and fails closed on missing schema references', () => {
  const sql = read('supabase/migrations/20261111000000_admin_user_deletion_safety.sql');
  assert.match(sql, /security definer/i);
  assert.match(sql, /revoke all on function public\.admin_user_deletion_blockers\(uuid, text\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.admin_user_deletion_blockers\(uuid, text\) to service_role/i);
  assert.match(sql, /raise exception 'Deletion dependency table is missing/);
  assert.match(sql, /raise exception 'Deletion dependency column is missing/);
});

test('admin Users panel provides reversible and super-admin-only permanent actions', () => {
  const dashboard = read('src/pages/AdminDashboard.jsx');
  assert.match(dashboard, /'deactivate'/);
  assert.match(dashboard, /'reactivate'/);
  assert.match(dashboard, /'delete'/);
  assert.match(dashboard, /isSuperAdmin && u\.id !== currentUserId/);
  assert.match(dashboard, /roleFilter/);
  assert.match(dashboard, /statusFilter/);
  assert.match(dashboard, /admin-manage-user/);
});
