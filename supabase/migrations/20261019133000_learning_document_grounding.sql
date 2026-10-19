-- Only reviewed, published learning documents are indexed. Never ingest student applications, legal files, or private chats.
create table if not exists public.learning_knowledge_chunks (
 id bigint generated always as identity primary key,
 source_type text not null check (source_type in ('educational_resources','caps_documents','resources')),
 source_id uuid not null,
 title text not null,
 subject text,
 grade text,
 page_number integer not null check (page_number > 0),
 chunk_number integer not null check (chunk_number >= 0),
 content text not null check (length(content) between 20 and 2500),
 indexed_at timestamptz not null default now(),
 unique (source_type,source_id,page_number,chunk_number)
);
create index if not exists learning_knowledge_search_idx on public.learning_knowledge_chunks using gin (to_tsvector('english',content));
create index if not exists learning_knowledge_scope_idx on public.learning_knowledge_chunks (subject,grade,source_type,source_id);
alter table public.learning_knowledge_chunks enable row level security;
revoke all on public.learning_knowledge_chunks from anon,authenticated;
grant select,insert,update,delete on public.learning_knowledge_chunks to service_role;
grant usage,select on sequence public.learning_knowledge_chunks_id_seq to service_role;
create or replace function public.search_learning_knowledge(p_query text,p_subject text default null,p_grade text default null,p_limit integer default 5)
returns table (source_type text,source_id uuid,title text,subject text,grade text,page_number integer,content text,score real)
language sql stable security invoker set search_path=public as $$
 with terms as (
  select string_agg(quote_literal(word), ' | ') as q from (
    select distinct lower(word) word from regexp_split_to_table(left(coalesce(p_query,''),400), '[^[:alnum:]]+') word
    where length(word)>=4 and lower(word) not in ('what','where','when','with','this','that','explain','please','about','give','show','some','could','would','should','from','grade','student','learner','question','questions','help','understand','define','difference','between','describe','examples','example','answer')
    limit 15
  ) words
 ), ts as (select case when q is null then null else to_tsquery('english',q) end query from terms)
 select k.source_type,k.source_id,k.title,k.subject,k.grade,k.page_number,k.content,
 ts_rank(to_tsvector('english',k.content),ts.query)::real score
 from public.learning_knowledge_chunks k cross join ts
 where ts.query is not null and to_tsvector('english',k.content) @@ ts.query
 and (nullif(p_subject,'') is null or lower(k.subject)=lower(p_subject))
 and (nullif(p_grade,'') is null or lower(k.grade)=lower(p_grade))
 and (
   (k.source_type='educational_resources' and exists (select 1 from public.educational_resources r where r.id=k.source_id and r.is_active=true))
   or (k.source_type='caps_documents' and exists (select 1 from public.caps_documents r where r.id=k.source_id and r.is_active=true))
   or (k.source_type='resources' and exists (select 1 from public.resources r where r.id=k.source_id and r.is_approved=true and coalesce(r.is_archived,false)=false and coalesce(r.is_rejected,false)=false and coalesce(r.is_premium,false)=false))
 )
 order by score desc, k.page_number asc limit least(greatest(coalesce(p_limit,5),1),8);
$$;
revoke all on function public.search_learning_knowledge(text,text,text,integer) from public,anon,authenticated;
grant execute on function public.search_learning_knowledge(text,text,text,integer) to service_role;
