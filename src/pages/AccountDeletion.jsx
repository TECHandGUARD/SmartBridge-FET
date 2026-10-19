import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

export default function AccountDeletion() {
  const address = 'aneleq@techandguard.co.za';
  const subject = encodeURIComponent('SmartBridge FET account and data deletion request');
  const [signedIn, setSignedIn] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setSignedIn(!!data?.user);
      if (data?.user) {
        const { data: requests } = await supabase.from('account_deletion_requests')
          .select('status,requested_at').in('status', ['pending','reviewing'])
          .order('requested_at', { ascending: false }).limit(1);
        if (active && requests?.length) setStatus('Your account deletion request is recorded and awaiting review.');
      }
      if (active) setLoading(false);
    })().catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function requestDeletion() {
    if (!window.confirm('Request deletion of your SmartBridge account and associated data? This starts a verified review, not immediate deletion.')) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('request_account_deletion');
      if (error) throw error;
      setStatus('Your account deletion request has been recorded. Support will review it and any legally required retention.');
    } catch {
      setStatus('The request could not be recorded. Please contact support using the email option below.');
    } finally { setSubmitting(false); }
  }

  return <main className="mx-auto max-w-2xl px-5 py-12 space-y-5">
    <h1 className="text-3xl font-bold">Request account and data deletion</h1>
    <p>SmartBridge FET is operated by TECH AND GUARD (Pty) Ltd. You can request deletion of your account and associated personal information, even if you have uninstalled the app or cannot sign in.</p>
    {!loading && signedIn && <section className="rounded-xl border p-5 space-y-3" aria-label="In-app account deletion request">
      <h2 className="text-lg font-semibold">Request deletion from this account</h2>
      <p className="text-sm">We will verify your request and assess information that must legally be retained, such as financial transaction records. This request does not instantly erase data.</p>
      <button type="button" disabled={submitting} onClick={requestDeletion} className="rounded-lg bg-destructive px-5 py-3 font-semibold text-destructive-foreground disabled:opacity-50">{submitting ? 'Submitting…' : 'Request account deletion'}</button>
      {status && <p role="status" className="text-sm">{status}</p>}
    </section>}
    {!loading && !signedIn && <p>To submit a request from within the app, <Link className="underline" to="/login">sign in</Link>. You can also request deletion by email if you cannot sign in.</p>}
    <h2 className="text-lg font-semibold">Request deletion without signing in</h2>
    <p>Email from the address associated with your account. If you no longer have access to it, explain this so support can verify ownership securely. Never email your password, identity document or payment card details.</p>
    <a className="inline-flex rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground" href={`mailto:${address}?subject=${subject}`}>Email account deletion request</a>
    <p className="text-sm">If the email button does not open, contact <a className="underline" href={`mailto:${address}`}>{address}</a> with the subject “SmartBridge FET account and data deletion request”.</p>
    <p className="text-sm">Requests require verification and review. Some information may be retained where the law requires it. <Link className="underline" to="/privacy">Read the privacy policy</Link>.</p>
  </main>;
}
