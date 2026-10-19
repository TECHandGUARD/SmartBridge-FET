-- Administrator UI cannot forge financial receipts through a direct row update.
create or replace function smartbridge_private.booking_finance_boundary() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if (new.payment_status,new.amount_paid,new.payment_reference,new.payment_intent_id,new.payment_mode,new.platform_fee,new.tutor_net,new.payout_status,new.payout_reference,new.amount,new.hold_expires_at)
 is distinct from (old.payment_status,old.amount_paid,old.payment_reference,old.payment_intent_id,old.payment_mode,old.platform_fee,old.tutor_net,old.payout_status,old.payout_reference,old.amount,old.hold_expires_at)
 and not (current_setting('role',true)='service_role' or (current_user='postgres' and (current_setting('smartbridge.cancel_booking',true)='true' or auth.uid() is null))) then raise exception 'Financial receipts and payout records are server managed';end if;
 if new.status='confirmed' and new.proposed_date is not null then raise exception 'Learner must accept the proposed time';end if;
 if new.status in ('confirmed','completed') and new.amount>0 and new.payment_status not in ('paid','test_paid','sponsored') then raise exception 'Payment must be verified before accepting this booking';end if;
 if new.status='confirmed' and new.payment_status in ('paid','test_paid') and coalesce((new.metadata->>'late_payment')::boolean,false) then raise exception 'Late payment requires refund or rescheduling by support';end if;
 if new.status='completed' and new.payment_status='paid' and old.status<>'completed' then new.payout_status:='pending';end if;
 if new.status='cancelled' then new.payout_status:='blocked';end if;
 return new;
end $$;
