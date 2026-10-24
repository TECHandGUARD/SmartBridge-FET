-- Dedicated learner-call signaling. Kept fail-closed until moderator-presence admission exists.
create table if not exists public.peer_study_call_signals (
 id uuid primary key default gen_random_uuid(),
 meeting_id uuid not null references public.peer_study_calls(id) on delete cascade,
 sender_id uuid not null references public.users(id),
 recipient_id uuid not null references public.users(id),
 kind text not null check(kind in ('ready','offer','answer','ice','leave')),
 payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default (now()+interval '5 minutes'),
 check(sender_id<>recipient_id),
 check(octet_length(payload::text)<=16384),
 check(expires_at<=created_at+interval '10 minutes')
);
create index if not exists peer_call_signals_recipient on public.peer_study_call_signals(meeting_id,recipient_id,created_at);
create index if not exists peer_call_signals_expiry on public.peer_study_call_signals(expires_at);
alter table public.peer_study_call_signals enable row level security;
revoke all on public.peer_study_call_signals from public,anon,authenticated;
grant select on public.peer_study_call_signals to authenticated;
-- Deliberately no insert grant or select policy: signaling stays unavailable until
-- a verified moderator is actively present and admitted participants are tracked.
