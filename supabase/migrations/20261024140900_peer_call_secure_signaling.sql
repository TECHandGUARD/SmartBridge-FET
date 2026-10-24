-- Signaling is allowed only between current, eligible, live call participants.
create or replace function smartbridge_private.peer_call_can_signal(call_key uuid,actor uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select actor=auth.uid() and smartbridge_private.peer_call_host_live(call_key) and exists(
  select 1 from public.peer_study_calls c
  join public.peer_study_call_members m on m.call_id=c.id and m.user_id=actor
  where c.id=call_key and c.status='active' and c.expires_at>now()
   and m.left_at is null and m.last_seen_at>now()-interval '45 seconds'
   and (actor=c.host_id or smartbridge_private.peer_study_eligible(actor,c.room_id))
 );
$$;
revoke all on function smartbridge_private.peer_call_can_signal(uuid,uuid) from public,anon,authenticated;
-- Internal recipient check must not use auth.uid() because recipient is another participant.
create or replace function smartbridge_private.peer_call_recipient_admitted(call_key uuid,recipient uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select smartbridge_private.peer_call_host_live(call_key) and exists(
  select 1 from public.peer_study_calls c
  join public.peer_study_call_members m on m.call_id=c.id and m.user_id=recipient
  join public.users u on u.id=recipient and u.is_active and u.onboarding_complete
  where c.id=call_key and c.status='active' and c.expires_at>now()
   and m.left_at is null and m.last_seen_at>now()-interval '45 seconds'
   and (recipient=c.host_id or (u.role='student'
    and u.date_of_birth <= (current_date-interval '15 years')::date
    and smartbridge_private.peer_call_verified_age(recipient)
    and smartbridge_private.peer_call_has_guardian_grant(recipient)
    and exists(select 1 from public.study_room_memberships sm where sm.room_id=c.room_id and sm.user_id=recipient)))
 );
$$;
revoke all on function smartbridge_private.peer_call_recipient_admitted(uuid,uuid) from public,anon,authenticated;
create policy "Live admitted recipient reads peer signaling" on public.peer_study_call_signals
 for select to authenticated using (
  recipient_id=auth.uid() and expires_at>now()
  and smartbridge_private.peer_call_can_signal(meeting_id,auth.uid())
  and smartbridge_private.peer_call_recipient_admitted(meeting_id,sender_id)
 );
-- No client insert privilege: writes go through RPC with server-side validation.
create or replace function public.send_peer_study_signal(call_key uuid,recipient uuid,signal_kind text,signal_payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); signal_key uuid;
begin
 if actor is null or recipient is null or actor=recipient
  or signal_kind not in ('ready','offer','answer','ice','leave')
  or signal_payload is null or jsonb_typeof(signal_payload)<>'object'
  or octet_length(signal_payload::text)>8192
  or not smartbridge_private.peer_call_can_signal(call_key,actor)
  or not smartbridge_private.peer_call_recipient_admitted(call_key,recipient)
 then raise exception 'Signal not permitted' using errcode='42501';end if;
 if (select count(*) from public.peer_study_call_signals
     where sender_id=actor and created_at>now()-interval '1 minute')>=120
 then raise exception 'Signaling rate limit reached';end if;
 insert into public.peer_study_call_signals(meeting_id,sender_id,recipient_id,kind,payload)
 values(call_key,actor,recipient,signal_kind,signal_payload) returning id into signal_key;
 return signal_key;
end;$$;
revoke all on function public.send_peer_study_signal(uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.send_peer_study_signal(uuid,uuid,text,jsonb) to authenticated;
do $$begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='peer_study_call_signals')
 then alter publication supabase_realtime add table public.peer_study_call_signals;end if;
end $$;
