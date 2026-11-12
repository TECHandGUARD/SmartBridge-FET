-- Focused regression checks for optional media in existing presentation decks.
begin;
do $$
declare
 text_only jsonb:='{"theme":"forest","show_author":false,"slides":[{"title":"Legacy slide","body":"Text remains supported","notes":"","layout":"content"}]}';
 image_deck jsonb:='{"theme":"forest","show_author":false,"slides":[{"title":"Image slide","body":"Look at the diagram","notes":"","layout":"content","media":{"kind":"image","path":"00000000-0000-4000-8000-000000000001/deck/slide.png","caption":"Cell diagram"}}]}';
 video_deck jsonb:='{"theme":"ocean","show_author":false,"slides":[{"title":"Video slide","body":"Watch the demonstration","notes":"","layout":"content","media":{"kind":"video","path":"00000000-0000-4000-8000-000000000001/deck/clip.mp4","caption":"Short demonstration"}}]}';
 invalid_deck jsonb:='{"theme":"forest","show_author":false,"slides":[{"title":"Bad media","body":"","notes":"","layout":"content","media":{"kind":"executable","path":"x"}}]}';
begin
 if not smartbridge_private.valid_presentation(text_only) then raise exception 'Legacy text-only deck rejected';end if;
 if not smartbridge_private.valid_presentation(image_deck) then raise exception 'Image deck rejected';end if;
 if not smartbridge_private.valid_presentation(video_deck) then raise exception 'Video deck rejected';end if;
 if smartbridge_private.valid_presentation(invalid_deck) then raise exception 'Invalid media type accepted';end if;
 if not exists(select 1 from storage.buckets where id='lesson-media' and public=false) then raise exception 'Private lesson media bucket missing';end if;
 if not exists(select 1 from storage.buckets where id='marketing-media' and public=false) then raise exception 'Private campaign media bucket missing';end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='marketing_media_published_read') then raise exception 'Published campaign media read policy missing';end if;
end $$;
rollback;
