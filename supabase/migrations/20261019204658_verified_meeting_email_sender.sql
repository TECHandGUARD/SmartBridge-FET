-- Server-controlled sender for meeting mail, independent of the legacy sandbox sender.
alter table smartbridge_private.meeting_mail_settings drop constraint meeting_mail_settings_key_check;
alter table smartbridge_private.meeting_mail_settings add constraint meeting_mail_settings_key_check check(key in ('project_url','sender'));
create function public.meeting_email_sender() returns text language sql stable security definer set search_path='' as $$
 select value from smartbridge_private.meeting_mail_settings where key='sender'
$$;
revoke all on function public.meeting_email_sender() from public,anon,authenticated;
grant execute on function public.meeting_email_sender() to service_role;
