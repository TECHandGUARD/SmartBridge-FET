import { Link } from 'react-router-dom';
import { appConfig } from '@/lib/config';
import { useState } from 'react';
import { BookOpen, CheckCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
export default function TutorPendingScreen({ onRefresh }) {
  const { signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const refresh = async () => {
    setChecking(true); setError('');
    try { await onRefresh(); }
    catch { setError('Could not refresh your status. Please check your connection and retry.'); }
    finally { setChecking(false); }
  };
  return <main className="min-h-screen bg-background px-4 py-12">
    <div className="mx-auto max-w-lg">
      <div className="mb-8 flex items-center justify-center gap-2 font-playfair text-xl font-bold text-primary"><BookOpen className="h-6 w-6" aria-hidden="true" />SmartBridge FET</div>
      <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
        <ShieldCheck className="mb-5 h-10 w-10 text-primary" aria-hidden="true" />
        <p className="mb-2 text-sm font-medium text-primary">Application received</p>
        <h1 className="font-playfair text-2xl font-bold">Tutor verification pending</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Your application must be reviewed before you can access tutor tools.</p>
        <ol aria-label="Application progress" className="my-6 space-y-4 text-sm">
          <li className="flex items-center gap-3"><CheckCircle className="h-5 w-5 text-primary" aria-hidden="true" />Credentials and agreement submitted</li>
          <li aria-current="step" className="flex items-center gap-3 font-medium"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">2</span>Admin reviews your application</li>
          <li className="flex items-center gap-3 text-muted-foreground"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs">3</span>Tutor dashboard opens once approved</li>
        </ol>
        <p className="mb-6 text-sm text-muted-foreground">You can return to this page to check your status. If your credentials need correcting, contact <a className="text-primary underline" href={`mailto:${appConfig.company.supportEmail}`}>support</a>.</p>
        {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
        <div className="flex flex-col gap-3 sm:flex-row"><Button onClick={refresh} disabled={checking} className="min-h-11">{checking ? 'Checking…' : 'Check verification'}</Button><Button variant="outline" onClick={signOut} disabled={checking} className="min-h-11">Sign out</Button></div>
      </section>
      <nav aria-label="Legal information" className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
        <Link to="/terms" className="min-h-11 inline-flex items-center text-primary underline underline-offset-4">Legal documents</Link>
        <Link to="/privacy" className="min-h-11 inline-flex items-center text-primary underline underline-offset-4">Privacy policy</Link>
      </nav>
    </div>
  </main>;
}
