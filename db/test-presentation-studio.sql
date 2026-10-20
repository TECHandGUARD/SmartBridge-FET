reset role;
select set_config('request.jwt.claims','{}',true);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007602","role":"authenticated"}',true);
insert into public.presentation_decks(id,title,content) values('00000000-0000-4000-8000-000000007631','Test lesson','{"theme":"forest","show_author":true,"slides":[{"title":"Fractions","body":"Compare values","notes":"Private tutor notes","layout":"content"}]}');
update public.presentation_decks set title='Updated lesson' where id='00000000-0000-4000-8000-000000007631' and revision=1;
do $$begin
 if not exists(select 1 from public.presentation_decks where id='00000000-0000-4000-8000-000000007631' and revision=2) then raise exception 'Deck revision not advanced';end if;
 update public.presentation_decks set title='Stale update' where id='00000000-0000-4000-8000-000000007631' and revision=1;
 if found then raise exception 'Stale revision overwrite';end if;
 begin insert into public.presentation_decks(title,content) values('Invalid deck','{"theme":"evil","slides":[]}');raise exception 'Malformed presentation saved';exception when check_violation then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007601","role":"authenticated"}',true);
do $$begin
 if exists(select 1 from public.presentation_decks where id='00000000-0000-4000-8000-000000007631') then raise exception 'Admin read another author notes';end if;
 begin insert into public.presentation_decks(owner_id,title,content) values('00000000-0000-4000-8000-000000007602','Forged ownership','{"theme":"forest","show_author":false,"slides":[{"title":"Test","body":"","notes":"","layout":"title"}]}');raise exception 'Owner forged';exception when insufficient_privilege then null;end;
end $$;
insert into public.presentation_decks(title,content) values('Admin own deck','{"theme":"ocean","show_author":false,"slides":[{"title":"Welcome","body":"Meeting goals","notes":"","layout":"title"}]}');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007603","role":"authenticated"}',true);
do $$begin
 if exists(select 1 from public.presentation_decks) then raise exception 'Parent read private decks';end if;
 begin insert into public.presentation_decks(title,content) values('Parent deck','{"theme":"forest","show_author":false,"slides":[{"title":"Test","body":"","notes":"","layout":"title"}]}');raise exception 'Parent created presentation';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
select 'PASS: tutor/admin authoring, private notes, owner isolation, validation and revision conflict checks' result;
