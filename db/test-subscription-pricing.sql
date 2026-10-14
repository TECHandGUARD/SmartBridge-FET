reset role;
update public.users set is_active=true,is_super_admin=true where id='00000000-0000-4000-8000-000000000102';
update public.users set is_active=true where id='00000000-0000-4000-8000-000000000101';
select set_config('request.jwt.claims','{}',true);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
do $$begin
 begin perform public.set_subscription_price('student',50000,1);raise exception 'Student edited prices';exception when raise_exception then if sqlerrm='Student edited prices' then raise;end if;end;
 begin update public.subscription_prices set amount_cents=1;raise exception 'Direct price edit allowed';exception when insufficient_privilege then null;end;
end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated"}',true);
select public.set_subscription_price('student',50000,1);
do $$begin
 if (select amount_cents from public.subscription_prices where product='parent')<>5000 then raise exception 'Other plan changed';end if;
 begin perform public.set_subscription_price('student',70000,1);raise exception 'Stale revision accepted';exception when raise_exception then if sqlerrm='Stale revision accepted' then raise;end if;end;
 begin perform public.set_subscription_price('student',0,2);raise exception 'Zero price accepted';exception when raise_exception then if sqlerrm='Zero price accepted' then raise;end if;end;
end;$$;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$begin
 if not exists(select 1 from smartbridge_private.subscription_price_audit where product='student' and old_amount_cents=2000 and new_amount_cents=50000) then raise exception 'Price audit missing';end if;
 begin perform public.create_gateway_payment_order('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000009601','student',2000,'test','yoco');raise exception 'Stale quote accepted';exception when raise_exception then if sqlerrm='Stale quote accepted' then raise;end if;end;
 perform public.create_gateway_payment_order('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000009601','student',50000,'test','yoco');
 if (select amount_cents from public.payment_orders where id='00000000-0000-4000-8000-000000000601')<>2000 then raise exception 'Existing order changed';end if;
end;$$;
reset role;
