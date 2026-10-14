// Local Postgres 17 SQL replay; managed Auth/Storage HTTP services are not simulated.
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {pg_trgm}=require('@electric-sql/pglite/contrib/pg_trgm');
(async()=>{const db=new PGlite({extensions:{pg_trgm}});try{
const version=(await db.query('select version()')).rows[0].version;assert.ok(version.startsWith('PostgreSQL 17.'),version);console.log('ENGINE',version);
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create role supabase_admin superuser;
create schema auth;create schema storage;create schema extensions;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',updated_at timestamptz default now());
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create function auth.uid() returns uuid language sql stable as $$select nullif(auth.jwt()->>'sub','')::uuid$$;
create function auth.role() returns text language sql stable as $$select coalesce(auth.jwt()->>'role',nullif(current_setting('request.jwt.claim.role',true),''))$$;
create function auth.email() returns text language sql stable as $$select auth.jwt()->>'email'$$;
create table storage.buckets(id text primary key,name text,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner uuid,owner_id text,metadata jsonb default '{}',created_at timestamptz default now(),updated_at timestamptz default now());
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
grant usage on schema public,auth,storage,extensions to anon,authenticated,service_role;
grant all on all tables in schema storage to anon,authenticated,service_role;
alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
`);
const directory=path.join(process.cwd(),'supabase/migrations');
for(const name of fs.readdirSync(directory).filter(x=>x.endsWith('.sql')).sort()){
 console.log('APPLY',name);const sql=fs.readFileSync(path.join(directory,name),'utf8');await db.exec(sql);
 if(name.includes('capture_live_schema_baseline')){
  const snapshot=JSON.parse(fs.readFileSync('db/baseline/live-schema.snapshot.json','utf8'));
  const actual=(await db.query(`select c.relname as table_name,a.attname as column_name,format_type(a.atttypid,a.atttypmod) as column_type,a.attnotnull as not_null,pg_get_expr(d.adbin,d.adrelid) as default_value from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped`)).rows;
  const expected=snapshot.tables.flatMap(t=>t.columns.map(c=>({table_name:t.name,column_name:c.name,column_type:c.type,not_null:c.not_null,default_value:c.default})));
  const sort=items=>items.sort((a,b)=>(a.table_name+'.'+a.column_name).localeCompare(b.table_name+'.'+b.column_name));assert.deepEqual(sort(actual),sort(expected));
  const policies=(await db.query(`select count(*)::int as n from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' or (n.nspname='storage' and c.relname='objects')`)).rows[0].n;
  assert.equal(policies,snapshot.policies.length);
  // A matching existing database must be a no-op, preserving later/legacy objects.
  await db.exec(sql);
  for(const [mutation,message] of [
   ['alter table public.forum_posts alter column title type varchar(1200)','Live schema differs'],
   ['alter table public.forum_comments drop constraint forum_comments_parent_comment_id_fkey','Live key constraints differ'],
   ['alter table public.users disable row level security','must retain row level security']
  ]){
   await db.exec('begin;');await db.exec(mutation);
   await assert.rejects(db.exec(sql),error=>error.message.includes(message));await db.exec('rollback;');
  }
  console.log('PASS: baseline column/default parity, policy inventory, existing-schema guard and drift rejection');
 }
}
console.log('PASS: fresh schema, original history, baseline and all repairs replay');
await db.exec('begin;');
for(const name of ['test-core-flows.sql','test-bookings-and-links.sql','test-api-integrations.sql','test-payment-gateways.sql','test-operations.sql','test-study-rooms.sql','test-mvp-access.sql','test-learning-progress.sql','test-improvements.sql','test-counselor.sql']){
 console.log('TEST',name);await db.exec(fs.readFileSync(path.join(process.cwd(),'db',name),'utf8'));}
await db.exec('rollback;');console.log('PASS: all ten security/workflow SQL fixtures');
}finally{await db.close();}})().catch(e=>{console.error('ERROR',e.message,e.where||'',e.detail||'');process.exit(1)});
