import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function TermsOfService() {
  const { user } = useAuth();
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ✅ Check if user is a tutor
  const isTutor = ['sace_tutor', 'student_tutor'].includes(user?.role);

  useEffect(() => {
    async function fetchTerms() {
      try {
        setLoading(true);
        setError(false);

        // ✅ Fetch student terms
        const { data: studentDoc, error: studentError } = await supabase
          .from('legal_documents')
          .select('content')
          .eq('doc_key', 'terms_student')
          .single();

        if (studentError) throw studentError;

        let content = studentDoc?.content || '';

        // ✅ If tutor, also fetch tutor addendum
        if (isTutor) {
          const { data: tutorDoc, error: tutorError } = await supabase
            .from('legal_documents')
            .select('content')
            .eq('doc_key', 'terms_tutor')
            .single();

          if (!tutorError && tutorDoc) {
            content += `\n\n---\n\n${tutorDoc.content}`;
          }
        }

        setMarkdown(content || 'Terms temporarily unavailable.');
      } catch (err) {
        console.error('Fetch error:', err);
        setError(true);
        setMarkdown('Unable to load Terms of Service. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchTerms();
  }, [isTutor]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center gap-2 bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-semibold">Loading legal terms...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-card border-b border-border py-10">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-xs text-muted-foreground mt-1">Effective: 23 May 2026 · SmartBridge FET</p>
          {isTutor && (
            <Badge className="mt-3 bg-emerald-500/10 text-emerald-600 border-none font-bold gap-1">
              <ShieldCheck className="w-3 h-3" /> Tutor Version (Includes Contract)
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {error ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load legal terms. Please try again later.</p>
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
