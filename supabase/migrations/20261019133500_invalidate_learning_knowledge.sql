create or replace function public.invalidate_learning_knowledge() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if TG_OP='DELETE' then
  delete from public.learning_knowledge_chunks where source_type=TG_ARGV[0] and source_id=old.id;
  return old;
 end if;
 if (TG_ARGV[0]='educational_resources' and (new.resource_url is distinct from old.resource_url or new.subject is distinct from old.subject or new.grade is distinct from old.grade or new.is_active is distinct from old.is_active))
 or (TG_ARGV[0]='caps_documents' and (new.file_url is distinct from old.file_url or new.subject is distinct from old.subject or new.grade is distinct from old.grade or new.is_active is distinct from old.is_active)) then
  delete from public.learning_knowledge_chunks where source_type=TG_ARGV[0] and source_id=new.id;
 end if;
 return new;
end;
$$;
drop trigger if exists invalidate_educational_knowledge on public.educational_resources;
create trigger invalidate_educational_knowledge after update or delete on public.educational_resources for each row execute function public.invalidate_learning_knowledge('educational_resources');
drop trigger if exists invalidate_caps_knowledge on public.caps_documents;
create trigger invalidate_caps_knowledge after update or delete on public.caps_documents for each row execute function public.invalidate_learning_knowledge('caps_documents');
revoke all on function public.invalidate_learning_knowledge() from public,anon,authenticated;
