create table if not exists public.instant_adult_call_signals(
 id uuid primary key default gen_random_uuid(),
 meeting_id uuid not null references public.instant_adult_calls(id) on delete cascade,
 sender_id uuid not null references public.users(id),
 recipient_id uuid not null references public.users(id),
 kind text not null check(kind in ('ready','offer','answer','ice','leave')),
 payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default(now()+interval '5 minutes'),
 check(sender_id<>recipient_id),check(octet_length(payload::text)<=16384)
);
create index if not exists instant_adult_signals_recipient on public.instant_adult_call_signals(recipient_id,meeting_id,created_at);
alter table public.instant_adult_call_signals enable row level security;
revoke all on public.instant_adult_call_signals from public,anon,authenticated;
grant select on public.instant_adult_call_signals to authenticated;
create or replace function smartbridge_private.instant_call_participant(call_key uuid,actor uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.instant_adult_calls c where c.id=call_key and c.status='accepted'
 and c.answered_at>now()-interval '2 hours' and actor in(c.caller_id,c.callee_id)
 and smartbridge_private.meeting_adult(c.caller_id) and smartbridge_private.meeting_adult(c.callee_id));
$$;
revoke all on function smartbridge_private.instant_call_participant(uuid,uuid) from public,anon,authenticated;
create policy "Participant receives adult call signaling" on public.instant_adult_call_signals
 for select to authenticated using(recipient_id=auth.uid() and expires_at>now()
 and smartbridge_private.instant_call_participant(meeting_id,auth.uid())
 and smartbridge_private.instant_call_participant(meeting_id,sender_id));
create or replace function public.send_instant_adult_signal(call_key uuid,recipient uuid,signal_kind text,signal_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); key uuid;
begin
 if actor is null or recipient is null or actor=recipient or signal_kind not in ('ready','offer','answer','ice','leave')
 or signal_payload is null or jsonb_typeof(signal_payload)<>'object' or octet_length(signal_payload::text)>8192
 or not smartbridge_private.instant_call_participant(call_key,actor)
 or not smartbridge_private.instant_call_participant(call_key,recipient)
 then raise exception 'Call signaling not permitted' using errcode='42501';end if;
 if (select count(*) from public.instant_adult_call_signals where sender_id=actor and created_at>now()-interval '1 minute')>=120
 then raise exception 'Signaling rate limit exceeded';end if;
 insert into public.instant_adult_call_signals(meeting_id,sender_id,recipient_id,kind,payload)
 values(call_key,actor,recipient,signal_kind,signal_payload) returning id into key;
 return key;
end;$$;
revoke all on function public.send_instant_adult_signal(uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.send_instant_adult_signal(uuid,uuid,text,jsonb) to authenticated;
do $$begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='instant_adult_call_signals')
 then alter publication supabase_realtime add table public.instant_adult_call_signals;end if;
end $$;
