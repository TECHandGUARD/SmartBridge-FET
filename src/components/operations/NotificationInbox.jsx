import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { dispatchNotifications } from '@/lib/action-notifications';
import { Button } from '@/components/ui/button';
import PropTypes from 'prop-types';

export default function NotificationInbox({ userId }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('action_notifications').select('id,subject,message,email_status,created_at').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(20);
    if (error) { setError('Notifications could not load. Please retry.'); return; }
    setItems(data || []); setError('');
  }, [userId]);
  useEffect(() => {
    setItems([]); load();
    const channel = supabase.channel(`notifications-${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'action_notifications', filter: `recipient_id=eq.${userId}` }, load).subscribe();
    const timer = setInterval(load, 60000);
    return () => { clearInterval(timer); supabase.removeChannel(channel); };
  }, [userId, load]);
  const retry = async () => {
    const { data, error } = await supabase.rpc('action_notification_ids', { action_booking: null });
    if (error) { setError('Email retries are unavailable.'); return; }
    const result = await dispatchNotifications((data || []).slice(0, 10));
    if (result.status === 'queued') setError('Email remains queued. Contact support if provider setup is required.');
    else await load();
  };
  return <aside className="mx-auto w-full max-w-7xl px-4 py-2" aria-label="Account notifications">
    <Button type="button" variant="outline" size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>Notifications ({items.length})</Button>
    {open && <div className="mt-3 space-y-3 rounded-lg border p-4">
      {error && <p role="alert">{error}</p>}
      <Button type="button" variant="outline" size="sm" onClick={retry}>Retry queued emails</Button>
      {!items.length && !error && <p>No notifications yet.</p>}
      {items.map(item => <article key={item.id} className="border-b pb-2"><h2 className="font-semibold">{item.subject}</h2><p className="whitespace-pre-wrap text-sm">{item.message}</p><p className="text-xs text-muted-foreground">Email: {item.email_status === 'accepted' ? 'Accepted by email provider; inbox delivery not confirmed' : item.email_status}</p></article>)}
    </div>}
  </aside>;
}
NotificationInbox.propTypes = { userId: PropTypes.string.isRequired };
