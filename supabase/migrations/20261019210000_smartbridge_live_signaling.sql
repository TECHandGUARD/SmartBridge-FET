-- SmartBridge Live Lite: booking-scoped 1:1 WebRTC signaling, no paid video API.
-- Signals are transient coordination data, never recordings or a public meeting URL.
create table if not exists public.classroom_signals (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.tutor_bookings(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  recipient_id uuid not null references auth.users(id),
  kind text not null check (kind in ('offer','answer','ice','ready','leave')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  constraint classroom_signal_not_self check(sender_id<>recipient_id),
  constraint classroom_signal_payload_size check(octet_length(payload::text)<=16384)
);
create index if not exists classroom_signals_booking_created on public.classroom_signals(booking_id,created_at);
create index if not exists classroom_signals_expiry on public.classroom_signals(expires_at);
alter table public.classroom_signals enable row level security;

create or replace function public.can_join_live_classroom(booking_key uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.tutor_bookings b
    join public.users tutor on tutor.id=b.tutor_id and tutor.is_active=true
    join public.users learner on learner.id=b.student_id and learner.is_active=true
    where b.id=booking_key and auth.uid() in (b.tutor_id,b.student_id)
      and b.status='confirmed'
      and (b.amount=0 or b.payment_status in ('paid','test_paid','sponsored'))
      and coalesce(b.start_time,(b.date+b.time::time) at time zone 'Africa/Johannesburg') <= now()+interval '20 minutes'
      and coalesce(b.end_time,((b.date+b.time::time) at time zone 'Africa/Johannesburg')+coalesce(b.duration_hours,1)*interval '1 hour') >= now()-interval '30 minutes'
  )
$$;
revoke all on function public.can_join_live_classroom(uuid) from public,anon;
grant execute on function public.can_join_live_classroom(uuid) to authenticated;

create policy "Classroom participants read their own signals"
on public.classroom_signals for select to authenticated
using (recipient_id=auth.uid() and expires_at>now() and public.can_join_live_classroom(booking_id));
create policy "Classroom participants send signals to booked peer"
on public.classroom_signals for insert to authenticated
with check (
  sender_id=auth.uid()
  and public.can_join_live_classroom(booking_id)
  and exists (
    select 1 from public.tutor_bookings b
    where b.id=booking_id
      and ((b.tutor_id=sender_id and b.student_id=recipient_id)
        or (b.student_id=sender_id and b.tutor_id=recipient_id))
  )
  and created_at >= now()-interval '1 minute'
  and created_at <= now()+interval '1 minute'
  and expires_at <= now()+interval '2 hours'
  and expires_at > now()
);
create policy "Classroom participants clear own signals"
on public.classroom_signals for delete to authenticated
using(sender_id=auth.uid() and public.can_join_live_classroom(booking_id));

revoke all on public.classroom_signals from public,anon;
grant select,insert,delete on public.classroom_signals to authenticated;
-- Supabase Realtime emits INSERT only to recipients permitted by RLS.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='classroom_signals') then
    alter publication supabase_realtime add table public.classroom_signals;
  end if;
end $$;
-- Expired signals must be purged by a scheduled maintenance job when volume grows.
