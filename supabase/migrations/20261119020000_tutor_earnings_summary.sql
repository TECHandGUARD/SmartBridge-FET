-- Use the same booking facts as the administrator's recorded payout workflow.
-- SECURITY INVOKER keeps booking RLS in effect for the caller.
create function public.my_tutor_earnings()
returns table(awaiting_payout numeric, payouts_recorded numeric, eligible_sessions bigint)
language sql stable security invoker
set search_path = ''
as $$
  select
    coalesce(sum(b.tutor_net) filter (where b.payout_status = 'pending'), 0),
    coalesce(sum(b.tutor_net) filter (where b.payout_status = 'paid'), 0),
    count(*)
  from public.tutor_bookings b
  where b.tutor_id = (select auth.uid())
    and b.status = 'completed'
    and b.payment_status = 'paid'
    and b.payment_mode = 'live'
    and b.payout_status in ('pending', 'paid')
    and b.tutor_net > 0
  having (select public.is_tutor(auth.uid()));
$$;

revoke all on function public.my_tutor_earnings() from public, anon;
grant execute on function public.my_tutor_earnings() to authenticated;
