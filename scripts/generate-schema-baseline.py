"""Reproduce the reviewed, schema-only catalogue; never reads live rows or credentials."""
import json,pathlib,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
source=root/'db/baseline/live-schema.snapshot.json'
s=json.loads(source.read_text())
assert not s['sequences'] and not s['enums'], 'Extend exporter for unsupported schema objects'
q=lambda x:'"'+x.replace('"','""')+'"'
literal=lambda x:"'"+x.replace("'","''")+"'"
def ident(t):return q(t['schema'])+'.'+q(t['name'])
def grants(items,target,kind='table'):
 lines=[f'revoke all on {kind} {target} from public,anon,authenticated,service_role;']
 groups={}
 for g in items or []:
  groups.setdefault((g['role'],g.get('grantable',False)),[]).append(g['privilege'])
 for (name,grantable),privileges in sorted(groups.items()):
  role='public' if name=='PUBLIC' else q(name)
  lines.append(f"grant {','.join(sorted(set(privileges)))} on {kind} {target} to {role}"+(' with grant option' if grantable else '')+';')
 return lines
# Recover the migration already recorded in production, rather than fabricating its history.
history=s['history'];assert len(history)==1
original=root/'supabase/migrations'/f"{history[0]['version']}_{history[0]['name']}.sql"
original.write_text('-- Recovered verbatim from the existing production migration history.\n'+'\n'.join(x.rstrip(';')+';' for x in history[0]['statements'])+'\n')
statements=['create extension if not exists pg_trgm with schema public;']
for t in sorted(s['tables'],key=lambda t:t['name']):
 columns=[]
 for c in t['columns']:
  assert not c['identity'] and not c['generated'], 'Extend generator for identity/generated columns'
  columns.append(q(c['name'])+' '+c['type']+(' default '+c['default'] if c['default'] else '')+(' not null' if c['not_null'] else ''))
 statements.append(f'create table if not exists {ident(t)} (\n  '+',\n  '.join(columns)+'\n);')
for t,c in sorted(((t,c) for t in s['tables'] for c in t['constraints'] or []),key=lambda item:item[1]['type']=='f'):
 # The recovered website migration may already supply these objects.
 ddl=f"alter table {ident(t)} add constraint {q(c['name'])} {c['definition']};"
 statements.append("do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid="+literal(ident(t))+"::regclass and conname="+literal(c['name'])+") then "+ddl+" end if;end $constraint$;")
for f in s['functions']:statements.append(f['definition'].rstrip()+';')
for v in s['views'] or []:
 opts=' with ('+','.join(v['options'])+')' if v['options'] else ''
 statements.append(f"create or replace view public.{q(v['name'])}{opts} as {v['definition'].rstrip().rstrip(';')};")
for t in s['tables']:
 for i in t['indexes'] or []:statements.append(i.replace('CREATE INDEX ','CREATE INDEX IF NOT EXISTS ',1).replace('CREATE UNIQUE INDEX ','CREATE UNIQUE INDEX IF NOT EXISTS ',1)+';')
 if t['rls']:statements.append(f'alter table {ident(t)} enable row level security;')
 if t['force_rls']:statements.append(f'alter table {ident(t)} force row level security;')
 statements.extend(grants(t['grants'],ident(t)))
for f in s['functions']:statements.extend(grants(f['grants'],f['signature'],'function'))
for v in s['views'] or []:statements.extend(grants(v['grants'],'public.'+q(v['name'])))
commands={'r':'select','a':'insert','w':'update','d':'delete','*':'all'}
for p in s['policies']:
 target=q(p['schema'])+'.'+q(p['table'])
 ddl=f"create policy {q(p['name'])} on {target} as "+('permissive' if p['permissive'] else 'restrictive')+' for '+commands[p['command']]+' to '+','.join('public' if r=='PUBLIC' else q(r) for r in p['roles'])
 if p['using']:ddl+=' using ('+p['using']+')'
 if p['check']:ddl+=' with check ('+p['check']+')'
 statements.append("do $policy$ begin if not exists(select 1 from pg_policy where polrelid="+literal(target)+"::regclass and polname="+literal(p['name'])+") then "+ddl+";end if;end $policy$;")
for trigger in s['triggers']:
 # Ordinary app triggers are absent on a fresh database; website history has none.
 statements.append(trigger+';')
for b in s['buckets']:
 mimes='null' if b['allowed_mime_types'] is None else 'array['+','.join(literal(x) for x in b['allowed_mime_types'])+']::text[]'
 statements.append('insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('+','.join([literal(b['id']),literal(b['name']),str(b['public']).lower(),'null' if b['file_size_limit'] is None else str(b['file_size_limit']),mimes])+') on conflict(id) do nothing;')
# This is the sole custom event trigger observed in the live catalogue.
statements.append("create event trigger ensure_rls on ddl_command_end when tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO') execute function public.rls_auto_enable();")
# Existing production schema must match the captured column/type contract. Then return
# without recreating legacy functions, policies or grants. Never drop production objects.
values=','.join('('+','.join(map(literal,[t['name'],c['name'],c['type']]))+')' for t in s['tables'] for c in t['columns'])
guard="""if to_regclass('public.users') is not null then
 if exists(select 1 from (values %s) as expected(table_name,column_name,column_type)
  where not exists(select 1 from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname=expected.table_name and a.attname=expected.column_name and not a.attisdropped
    and format_type(a.atttypid,a.atttypmod)=expected.column_type)) then
  raise exception 'Live schema differs from captured baseline; reconcile before rollout';
 end if;
 return;
end if;
"""%values
# Require the captured primary/foreign-key integrity and RLS on existing tables too.
constraints=','.join('('+','.join(map(literal,[t['name'],c['name'],c['definition']]))+')' for t in s['tables'] for c in t['constraints'] or [] if c['type'] in ('p','f'))
integrity=""" if exists(select 1 from (values %s) as expected(table_name,constraint_name,definition)
 where not exists(select 1 from pg_constraint co join pg_class c on c.oid=co.conrelid join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname=expected.table_name and co.conname=expected.constraint_name
 and pg_get_constraintdef(co.oid,true)=expected.definition)) then
 raise exception 'Live key constraints differ from baseline; reconcile before rollout';end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r' and c.relname in (%s) and not c.relrowsecurity) then
 raise exception 'Baseline tables must retain row level security';end if;
"""%(constraints,','.join(literal(t['name']) for t in s['tables'] if t['rls']))
guard=guard.replace(' return;',integrity+' return;')
body="-- Schema-only baseline captured 13 October 2026; no customer records or secrets.\n-- Ordered after the recovered website migration and before the repair migrations.\n-- Existing matching production schema is validated and left unchanged.\n-- Fresh databases must apply the subsequent security repairs before accepting users.\ndo $baseline$ begin\n"+guard
for sql in statements:
 assert '$baseline_ddl$' not in sql
 body+='execute $baseline_ddl$'+sql+'$baseline_ddl$;\n'
body+='end $baseline$;\n'
output=root/'supabase/migrations/20260822153132_capture_live_schema_baseline.sql'
output.write_text('\n'.join(line.rstrip() for line in body.replace('\r\n','\n').split('\n')))
print(json.dumps({'tables':len(s['tables']),'statements':len(statements),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'baseline':str(output.relative_to(root))}))
