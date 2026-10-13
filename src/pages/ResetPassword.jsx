import { getAccountDestination } from '@/lib/navigation';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { withTimeout } from '@/lib/auth-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export default function ResetPassword() {
  const { user, isLoadingAuth } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const submit = async event => {
    event.preventDefault(); setError('');
    if (password.length < 8 || password !== confirmation) { setError('Use at least 8 characters and make both passwords match.'); return; }
    setSaving(true);
    try {
      const { error } = await withTimeout(supabase.auth.updateUser({ password }));
      if (error) throw error;
      navigate(getAccountDestination(user), { replace: true });
    } catch (error) { setError(error.message); } finally { setSaving(false); }
  };
  if (isLoadingAuth) return <p className="p-8 text-center">Checking your recovery link…</p>;
  if (!user) return <main className="p-8 text-center"><p>Your recovery link is invalid or expired.</p><Link to="/forgot-password">Request a new link</Link></main>;
  return <form onSubmit={submit} className="max-w-md mx-auto p-8 space-y-4">
    <h1 className="text-2xl font-semibold">Choose a new password</h1>
    <label htmlFor="new-password">New password</label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} />
    <label htmlFor="confirm-password">Confirm password</label><Input id="confirm-password" type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} />
    {error && <p role="alert">{error}</p>}<Button disabled={saving}>{saving ? 'Saving…' : 'Save password'}</Button>
  </form>;
}
