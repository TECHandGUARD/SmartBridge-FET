-- Current account state overrides a stale access token for all exposed table policies.
create function smartbridge_private.enabled_account() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.users where id=auth.uid() and is_active=true);
$$;
revoke all on function smartbridge_private.enabled_account() from public,anon;
grant execute on function smartbridge_private.enabled_account() to authenticated;
do $block$
declare t record; definition text; fname text;
begin
 for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname not like 'tech_guard_%' and c.relrowsecurity loop
 execute format('create policy active_account_required on public.%I as restrictive for all to authenticated using ((select smartbridge_private.enabled_account())) with check ((select smartbridge_private.enabled_account()))',t.relname);
 end loop;
 -- SECURITY DEFINER bypasses RLS: check active identity in these RPC bodies too.
 foreach fname in array array['submit_tutor_assessment','mark_tutor_assessment','request_tutor_assessment_review'] loop
 select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=fname;
 definition:=regexp_replace(definition,'begin', E'begin\n if not smartbridge_private.enabled_account() then raise exception ''Active account required'';end if;', 'i');
 execute definition;
 end loop;
end $block$;
create policy active_account_required on storage.objects as restrictive for all to authenticated
 using ((select smartbridge_private.enabled_account())) with check ((select smartbridge_private.enabled_account()));

-- Published material is intentionally public. Drafts and editing remain full-admin only.
create table public.marketing_posts(
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
 title text not null check(length(btrim(title)) between 3 and 160),
 summary text not null default '' check(length(summary)<=400),
 body text not null default '' check(length(body)<=30000),
 kind text not null check(kind in ('article','campaign','event')),
 event_at timestamptz,
 published boolean not null default false,
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 updated_by uuid not null references public.users(id)
);
alter table public.marketing_posts enable row level security;
revoke all on public.marketing_posts from public,anon,authenticated;
grant select on public.marketing_posts to anon,authenticated;
grant all on public.marketing_posts to service_role;
create policy published_posts on public.marketing_posts for select to anon,authenticated using(published or smartbridge_private.is_admin(auth.uid()));
-- anon cannot call is_admin: use a separate policy with a safe invoker wrapper below.
drop policy published_posts on public.marketing_posts;
create policy published_posts on public.marketing_posts for select to anon using(published);
create policy member_posts on public.marketing_posts for select to authenticated using(published or smartbridge_private.is_admin(auth.uid()));
create policy active_account_required on public.marketing_posts as restrictive for all to authenticated using((select smartbridge_private.enabled_account())) with check((select smartbridge_private.enabled_account()));
create table smartbridge_private.marketing_audit(id bigint generated always as identity primary key,post_id uuid not null,actor_id uuid not null,version integer not null,published boolean not null,created_at timestamptz not null default now());
alter table smartbridge_private.marketing_audit enable row level security;
revoke all on smartbridge_private.marketing_audit from public,anon,authenticated;

create function public.save_marketing_post(p_id uuid,p_slug text,p_title text,p_summary text,p_body text,p_kind text,p_event_at timestamptz,p_published boolean,p_version integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare old public.marketing_posts; result_id uuid;
begin
 if not smartbridge_private.is_admin(auth.uid()) then raise exception 'Full administrator required';end if;
 if p_version is null or p_published is null or p_kind is null or p_title is null or p_slug is null then raise exception 'Complete the post fields';end if;
 if p_published and (length(btrim(coalesce(p_body,'')))<20 or (p_kind='event' and p_event_at is null)) then raise exception 'Published posts need content and events need a date';end if;
 if p_id is null then
 if p_version<>0 then raise exception 'Invalid initial version';end if;
 insert into public.marketing_posts(slug,title,summary,body,kind,event_at,published,updated_by) values(p_slug,btrim(p_title),coalesce(p_summary,''),coalesce(p_body,''),p_kind,p_event_at,p_published,auth.uid()) returning id into result_id;
 else
 select * into old from public.marketing_posts where id=p_id for update;
 if not found or old.version<>p_version then raise exception 'Post changed. Refresh before saving';end if;
 -- Keep already shared links stable.
 if old.slug<>p_slug then raise exception 'Post links cannot be renamed';end if;
 update public.marketing_posts set title=btrim(p_title),summary=coalesce(p_summary,''),body=coalesce(p_body,''),kind=p_kind,event_at=p_event_at,published=p_published,version=version+1,updated_by=auth.uid(),updated_at=now() where id=p_id;
 result_id:=p_id;
 end if;
 insert into smartbridge_private.marketing_audit(post_id,actor_id,version,published) select id,auth.uid(),version,published from public.marketing_posts where id=result_id;
 return result_id;
end $$;
revoke all on function public.save_marketing_post(uuid,text,text,text,text,text,timestamptz,boolean,integer) from public,anon;
grant execute on function public.save_marketing_post(uuid,text,text,text,text,text,timestamptz,boolean,integer) to authenticated;

-- Public tutor projection omits email, documents, contact details, DOB and SACE numbers.
create function public.public_tutors(p_id uuid default null) returns table(id uuid,full_name text,bio text,avatar_url text,subjects text[],grades text[],hourly_rate numeric,offers_free_intro boolean)
language sql stable security definer set search_path='' as $$
 select t.id,t.full_name,t.bio,t.avatar_url,t.subjects,t.grades,coalesce(t.session_price_per_hour,t.hourly_rate),t.offers_free_intro
 from public.tutor_profiles t join public.users u on u.id=t.user_id
 where t.is_verified and t.is_active and u.is_active and (p_id is null or t.id=p_id)
 order by t.full_name,t.id limit 200;
$$;
revoke all on function public.public_tutors(uuid) from public;
grant execute on function public.public_tutors(uuid) to anon,authenticated;

-- Attribution has no monetary reward. Each new member can be attributed once.
create table smartbridge_private.referral_codes(user_id uuid primary key references public.users(id) on delete cascade,code text not null unique default replace(gen_random_uuid()::text,'-',''));
create table smartbridge_private.marketing_attribution(user_id uuid primary key references public.users(id) on delete cascade,referrer_id uuid references public.users(id) on delete set null,post_id uuid references public.marketing_posts(id) on delete set null,created_at timestamptz not null default now(),check(referrer_id is distinct from user_id));
create index marketing_referrer_idx on smartbridge_private.marketing_attribution(referrer_id);
create index marketing_post_idx on smartbridge_private.marketing_attribution(post_id);
alter table smartbridge_private.referral_codes enable row level security;
alter table smartbridge_private.marketing_attribution enable row level security;
revoke all on smartbridge_private.referral_codes,smartbridge_private.marketing_attribution from public,anon,authenticated;
create function public.my_referral_link() returns text language plpgsql security definer set search_path='' as $$
declare result text;
begin
 if not smartbridge_private.enabled_account() then raise exception 'Active account required';end if;
 insert into smartbridge_private.referral_codes(user_id) values(auth.uid()) on conflict(user_id) do nothing;
 select code into result from smartbridge_private.referral_codes where user_id=auth.uid();return result;
end $$;
create function public.record_marketing_attribution(p_ref text default null,p_campaign text default null) returns boolean language plpgsql security definer set search_path='' as $$
declare account public.users; owner_id uuid; campaign_id uuid;
begin
 select * into account from public.users where id=auth.uid() and is_active for update;
 if not found then raise exception 'Active account required';end if;
 if account.created_at < now()-interval '7 days' then return false;end if;
 select r.user_id into owner_id from smartbridge_private.referral_codes r join public.users u on u.id=r.user_id where code=p_ref and u.is_active and r.user_id<>auth.uid();
 select id into campaign_id from public.marketing_posts where slug=p_campaign and published;
 if owner_id is null and campaign_id is null then return false;end if;
 insert into smartbridge_private.marketing_attribution(user_id,referrer_id,post_id) values(auth.uid(),owner_id,campaign_id) on conflict(user_id) do nothing;
 return found;
end $$;
create function public.marketing_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not smartbridge_private.is_admin(auth.uid()) then raise exception 'Full administrator required';end if;
 return jsonb_build_object('campaigns',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (
 select p.id,p.title,p.slug,count(a.user_id) as registrations,count(a.user_id) filter(where exists(select 1 from public.payment_orders o where o.user_id=a.user_id and o.status='paid' and o.mode='live' and o.paid_at>=a.created_at)) as paying_members
 from public.marketing_posts p left join smartbridge_private.marketing_attribution a on a.post_id=p.id group by p.id order by p.created_at desc limit 200) x),
 'referred_registrations',(select count(*) from smartbridge_private.marketing_attribution where referrer_id is not null));
end $$;
revoke all on function public.my_referral_link(),public.record_marketing_attribution(text,text),public.marketing_metrics() from public,anon;
grant execute on function public.my_referral_link(),public.record_marketing_attribution(text,text),public.marketing_metrics() to authenticated;

-- Authenticated write implementations remain outside the exposed API schema.
alter function public.save_marketing_post(uuid,text,text,text,text,text,timestamptz,boolean,integer) set schema smartbridge_private;
create function public.save_marketing_post(p_id uuid,p_slug text,p_title text,p_summary text,p_body text,p_kind text,p_event_at timestamptz,p_published boolean,p_version integer) returns uuid language sql security invoker set search_path='' as $$select smartbridge_private.save_marketing_post($1,$2,$3,$4,$5,$6,$7,$8,$9)$$;
alter function public.my_referral_link() set schema smartbridge_private;
create function public.my_referral_link() returns text language sql security invoker set search_path='' as $$select smartbridge_private.my_referral_link()$$;
alter function public.record_marketing_attribution(text,text) set schema smartbridge_private;
create function public.record_marketing_attribution(p_ref text default null,p_campaign text default null) returns boolean language sql security invoker set search_path='' as $$select smartbridge_private.record_marketing_attribution($1,$2)$$;
alter function public.marketing_metrics() set schema smartbridge_private;
create function public.marketing_metrics() returns jsonb language sql security invoker set search_path='' as $$select smartbridge_private.marketing_metrics()$$;
revoke all on function public.save_marketing_post(uuid,text,text,text,text,text,timestamptz,boolean,integer),public.my_referral_link(),public.record_marketing_attribution(text,text),public.marketing_metrics() from public,anon;
grant execute on function public.save_marketing_post(uuid,text,text,text,text,text,timestamptz,boolean,integer),public.my_referral_link(),public.record_marketing_attribution(text,text),public.marketing_metrics() to authenticated;

-- Counter increments are one SQL statement: concurrent requests cannot overwrite counts.
create function public.increment_caps_downloads(document_ids uuid[]) returns void language sql security invoker set search_path='' as $$
 update public.caps_documents set download_count=coalesce(download_count,0)+1 where id=any($1) and is_active;
$$;
revoke all on function public.increment_caps_downloads(uuid[]) from public,anon,authenticated;
grant execute on function public.increment_caps_downloads(uuid[]) to service_role;
