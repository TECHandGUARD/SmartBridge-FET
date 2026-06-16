import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function PrivacyPolicy() {
  const { user } = useAuth();
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isTutor = ['tutor', 'sace_tutor', 'student_tutor'].includes(user?.role);

  useEffect(() => {
    async function fetchPrivacy() {
      try {
        setLoading(true);
        setError(false);

        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch('/api/legal/privacy', {
          headers: {
            'Authorization': session ? `Bearer ${session.access_token}` : '',
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setMarkdown(data.content || 'Privacy policy temporarily unavailable.');
      } catch (err) {
        console.error('Fetch error:', err);
        setError(true);
        setMarkdown('Unable to load Privacy Policy. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchPrivacy();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center gap-2 bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-semibold">Loading privacy policy...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-card border-b border-border py-10">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-muted-foreground mt-1">Effective: 21 February 2026 · SmartBridge FET</p>
          {isTutor && (
            <Badge className="mt-3 bg-emerald-500/10 text-emerald-600 border-none font-bold gap-1">
              <ShieldCheck className="w-3 h-3" /> Tutor Version (Includes Addendum)
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        {/* ECT Act Disclosure */}
        <div className="bg-muted/40 border border-border rounded-xl p-5 text-xs text-muted-foreground space-y-1.5">
          <p className="font-bold text-foreground text-sm uppercase tracking-wider mb-1">ECT Act Statutory Disclosures</p>
          <p><span className="font-semibold">Corporate Body:</span> Tech & GUARD Pty Ltd (Registration No: 2026/155090/09)</p>
          <p><span className="font-semibold">Registered Office:</span> 6 Marais Road, Stellenbosch, 7600, South Africa</p>
          <p><span className="font-semibold">Compliance Channel:</span> aneleq@techandguard.co.za</p>
        </div>

        {error ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load privacy policy. Please try again later.</p>
          </div>
        ) : (
          <article className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}