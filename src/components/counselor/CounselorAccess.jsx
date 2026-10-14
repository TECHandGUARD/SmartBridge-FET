import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import PropTypes from 'prop-types';

export function CounselorAssignment() {
  const [staff, setStaff] = useState('');
  const [learner, setLearner] = useState('');
  const [school, setSchool] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async event => {
    event.preventDefault(); setSaving(true);
    try {
      const { error } = await supabase.rpc('assign_counselor', { counselor_email: staff, learner_email: learner, school_name: school });
      if (error) throw error;
      toast.success('Staff role assigned. The learner must approve sharing before staff can view their records.');
    } catch (error) { toast.error(error.message || 'Assignment failed.'); }
    finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="rounded-xl border p-4 space-y-3">
    <h2 className="font-semibold">Assign school counsellor access</h2>
    <p className="text-sm text-muted-foreground">Use registered accounts. This changes the staff account’s role to school counsellor. Verify their identity and school authority first; learner records remain private until sharing is approved.</p>
    <label className="block text-sm">Staff account email<Input type="email" value={staff} onChange={e => setStaff(e.target.value)} required /></label>
    <label className="block text-sm">Learner account email<Input type="email" value={learner} onChange={e => setLearner(e.target.value)} required /></label>
    <label className="block text-sm">School name<Input value={school} onChange={e => setSchool(e.target.value)} minLength={2} maxLength={200} required /></label>
    <Button disabled={saving}>{saving ? 'Assigning…' : 'Assign staff and request sharing'}</Button>
  </form>;
}

export function CounselorSharing({ userId }) {
  const [links, setLinks] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_counselor_sharing_requests');
    if (error) setError('Counsellor sharing requests could not load.');
    else { setLinks(data || []); setError(''); }
  }, [userId]);
  useEffect(() => {
    let active = true;
    const refresh = () => { if (active) load(); };
    refresh();
    const channel = supabase.channel(`counselor-sharing-${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'counselor_student_links', filter: `student_id=eq.${userId}` }, refresh).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [load, userId]);
  const respond = async (id, decision) => {
    setSaving(id);
    const { error } = await supabase.rpc('respond_counselor_link', { link_id: id, decision });
    if (error) toast.error('Sharing preference could not save.');
    else { toast.success(decision === 'approved' ? 'Application and document-status sharing approved.' : 'Counsellor access revoked.'); await load(); }
    setSaving('');
  };
  if (!links.length && !error) return null;
  return <section className="rounded-xl border p-4 space-y-3" aria-label="School counsellor sharing">
    <h2 className="font-semibold">School counsellor sharing</h2>
    <p className="text-sm">Your assigned counsellor can see your name, email, application progress, deadlines and document checklist after you approve. Files, identity numbers and other private account details are not shared by this dashboard. You can revoke access here.</p>
    {error && <><p role="alert">{error}</p><Button onClick={load}>Retry sharing requests</Button></>}
    {links.map(link => <div key={link.id} className="flex flex-wrap items-center gap-3"><span>{link.counselor_name || link.counselor_email} · {link.school_name} · {link.status}</span>
      {link.status !== 'approved' && <Button disabled={saving === link.id} onClick={() => respond(link.id, 'approved')}>Approve sharing</Button>}
      {link.status !== 'revoked' && <Button variant="outline" disabled={saving === link.id} onClick={() => respond(link.id, 'revoked')}>Revoke sharing</Button>}
    </div>)}
  </section>;
}
CounselorSharing.propTypes = { userId: PropTypes.string.isRequired };
