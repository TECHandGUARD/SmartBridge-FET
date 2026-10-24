-- Instant adult calls are independent of scheduled meeting invitations.
create table if not exists public.instant_adult_calls(
 id uuid primary key default gen_random_uuid(),
 caller_id uuid not null references public.users(id),
 callee_id uuid not null references public.users(id),
 kind text not null check(kind in ('audio','video')),
 status text not null default 'ringing' check(status in ('ringing','accepted','declined','missed','ended')),
 created_at timestamptz not null default now(),
 answered_at timestamptz,ended_at timestamptz,
 expires_at timestamptz not null default(now()+interval '45 seconds'),
 check(caller_id<>callee_id)
);
create index if not exists instant_adult_calls_caller on public.instant_adult_calls(caller_id,created_at desc);
create index if not exists instant_adult_calls_callee on public.instant_adult_calls(callee_id,created_at desc);
alter table public.instant_adult_calls enable row level security;
revoke all on public.instant_adult_calls from public,anon,authenticated;
grant select on public.instant_adult_calls to authenticated;
create policy "Adults see their own call history" on public.instant_adult_calls for select to authenticated
using ((caller_id=auth.uid() or callee_id=auth.uid()) and smartbridge_private.meeting_adult(auth.uid()));

create or replace function public.start_instant_adult_call(recipient uuid,call_kind text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();key uuid;
begin
 if actor is null or recipient is null or actor=recipient or call_kind not in ('audio','video')
 or not smartbridge_private.meeting_adult(actor) or not smartbridge_private.meeting_adult(recipient)
 then raise exception 'Only verified adult accounts may call each other' using errcode='42501';end if;
 if (select count(*) from public.instant_adult_calls where caller_id=actor and created_at>now()-interval '1 hour')>=15
 then raise exception 'Call request limit reached';end if;
 if exists(select 1 from public.instant_adult_calls where (caller_id=actor or callee_id=actor or caller_id=recipient or callee_id=recipient)
 and ((status='ringing' and expires_at>now()) or (status='accepted' and answered_at>now()-interval '2 hours')))
 then raise exception 'One participant is already on a call';end if;
 insert into public.instant_adult_calls(caller_id,callee_id,kind) values(actor,recipient,call_kind) returning id into key;
 return key;
end;$$;
create or replace function public.respond_instant_adult_call(call_key uuid,decision text)
returns boolean language plpgsql security definer set search_path='' as $$
declare c public.instant_adult_calls;actor uuid:=auth.uid();
begin
 select * into c from public.instant_adult_calls where id=call_key for update;
 if c.id is null or c.callee_id<>actor or c.status<>'ringing' or decision not in ('accepted','declined')
 then raise exception 'Incoming call unavailable' using errcode='42501';end if;
 if c.expires_at<=now() then
  update public.instant_adult_calls set status='missed',ended_at=now() where id=call_key;
  raise exception 'Call timed out';end if;
 if not smartbridge_private.meeting_adult(actor) or not smartbridge_private.meeting_adult(c.caller_id)
 then raise exception 'Adult call access required' using errcode='42501';end if;
 update public.instant_adult_calls set status=decision,answered_at=case when decision='accepted' then now() else null end,
 ended_at=case when decision='declined' then now() else null end where id=call_key;
 return true;
end;$$;
create or replace function public.end_instant_adult_call(call_key uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.instant_adult_calls set status=case when status='ringing' then 'declined' else 'ended' end,ended_at=now()
 where id=call_key and auth.uid() in (caller_id,callee_id) and status in ('ringing','accepted');
 return found;
end;$$;
revoke all on function public.start_instant_adult_call(uuid,text),public.respond_instant_adult_call(uuid,text),public.end_instant_adult_call(uuid) from public,anon;
grant execute on function public.start_instant_adult_call(uuid,text),public.respond_instant_adult_call(uuid,text),public.end_instant_adult_call(uuid) to authenticated;
