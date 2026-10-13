-- Self-reported learning progress; it never awards official marks or paid access.
create table public.syllabus_progress(
 id uuid primary key default gen_random_uuid(), student_id uuid not null default auth.uid() references public.users(id) on delete cascade,
 student_email text not null, subject text not null check(length(subject) between 1 and 100),
 topic_id text not null check(topic_id ~ '^[a-zA-Z0-9_-]{1,120}$'), completed boolean not null default true,
 completed_at timestamptz not null default now(), unique(student_id,subject,topic_id)
);
create table public.nbt_planner_progress(
 student_id uuid primary key default auth.uid() references public.users(id) on delete cascade,
 student_email text not null, completed_sessions jsonb not null default '{}',updated_at timestamptz not null default now(),
 check(jsonb_typeof(completed_sessions)='object' and length(completed_sessions::text)<=4000)
);
create table public.nbt_resources(
 id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 200),
 description text,url text not null check(url ~ '^https://'),type text not null default 'Guide',icon text default 'BookOpen',
 is_active boolean not null default false,display_order integer not null default 0,created_at timestamptz not null default now()
);
create function smartbridge_private.protect_learning_progress() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 if coalesce(auth.role(),'')='service_role' or (auth.uid() is null and session_user='postgres' and current_setting('role',true) in ('none','postgres')) then return new; end if;
 if not smartbridge_private.student_account() or new.student_id is distinct from auth.uid() then raise exception 'Active learner ownership required'; end if;
 if new.student_email is distinct from (select email from public.users where id=auth.uid()) then raise exception 'Progress email mismatch'; end if;
 if tg_op='UPDATE' and new.student_id is distinct from old.student_id then raise exception 'Progress ownership cannot change'; end if;
 if tg_table_name='nbt_planner_progress' then
  if exists(select 1 from jsonb_each(new.completed_sessions) e where e.key !~ '^[1-4]_(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$' or e.value<>'true'::jsonb) then raise exception 'Invalid preparation session'; end if;
  new.updated_at:=now();
 end if; return new;
end;$$;
revoke all on function smartbridge_private.protect_learning_progress() from public,anon,authenticated;
create trigger protect_syllabus_progress before insert or update on public.syllabus_progress for each row execute function smartbridge_private.protect_learning_progress();
create trigger protect_nbt_progress before insert or update on public.nbt_planner_progress for each row execute function smartbridge_private.protect_learning_progress();
do $$ declare relation text;begin
 foreach relation in array array['syllabus_progress','nbt_planner_progress'] loop
  execute format('alter table public.%I enable row level security',relation);
  execute format('revoke all on table public.%I from public,anon,authenticated',relation);
  execute format('grant select,insert,update,delete on table public.%I to authenticated',relation);
  execute format('grant all on table public.%I to service_role',relation);
  execute format('create policy "Own learner progress" on public.%I for all to authenticated using(student_id=(select auth.uid()) and smartbridge_private.student_account()) with check(student_id=(select auth.uid()) and smartbridge_private.student_account())',relation);
 end loop;end $$;
alter table public.nbt_resources enable row level security;
revoke all on table public.nbt_resources from public,anon,authenticated;
grant select,insert,update,delete on public.nbt_resources to authenticated;
grant all on public.nbt_resources to service_role;
create policy "Read active NBT resources" on public.nbt_resources for select to authenticated using(is_active=true and smartbridge_private.active_account());
create policy "Manage NBT resources" on public.nbt_resources for all to authenticated using(public.is_admin((select auth.uid()))) with check(public.is_admin((select auth.uid())));
