import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { FileText, ShieldCheck, Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { LEGAL_CATEGORIES, downloadLegalFile } from '@/lib/legal-files';
import { toast } from 'sonner';

export default function TermsOfService() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [agree, setAgree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    supabase.from('legal_documents')
      .select('id,doc_key,title,content,version,updated_at,is_published,category,audience,owner_user_id,contains_personal_information,file_path,document_sha256')
      .eq('is_published', true)
      .order('title')
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          setError('Legal documents could not load. Check your connection and try again.');
          setDocuments([]);
        } else {
          // The database RLS policy is authoritative; only show rows it returned.
          const visible = data || [];
          setDocuments(visible);
          setSelected(current => visible.some(item => item.id === current) ? current : (visible[0]?.id || ''));
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError('Legal documents could not load. Check your connection and try again.');
        setDocuments([]);
        setLoading(false);
      });
    return () => { active = false; };
  }, [user?.id, refresh]);

  useEffect(() => { setAgree(false); }, [selected, documents]);
  const document = documents.find(item => item.id === selected);
  const retry = useCallback(() => setRefresh(count => count + 1), []);

  const accept = async () => {
    if (!document || !agree || saving) return;
    setSaving(true);
    try {
      const { error: acceptError } = await supabase.rpc('accept_legal_document', {
        document_key: document.doc_key,
        expected_version: document.version,
        expected_sha256: document.document_sha256,
      });
      if (acceptError) throw acceptError;
      setAgree(false);
      toast.success('Your acceptance of this document version was recorded.');
    } catch (acceptError) {
      toast.error(acceptError.message || 'Acceptance could not be recorded. Please retry.');
    } finally { setSaving(false); }
  };

  return (
    <main id="legal-documents" className="mx-auto w-full max-w-6xl min-w-0 px-4 py-6 pb-24 text-foreground sm:px-6 sm:py-10">
      <header className="mb-7 rounded-3xl border bg-gradient-to-br from-emerald-950 to-emerald-800 p-5 text-white shadow-sm sm:p-9">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-emerald-100">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" /> Transparency &amp; trust
        </div>
        <h1 className="font-playfair text-3xl font-bold tracking-tight sm:text-4xl">Legal documents</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">
          Review the published agreements, terms, compliance information and policies available to your account.
        </p>
        <p className="mt-3 text-xs text-emerald-100">SmartBridge FET · TECH AND GUARD (Pty) Ltd · Registration 2026/155090/07</p>
      </header>

      <nav aria-label="Legal pages" className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link to="/terms" aria-current="page" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground">Legal documents</Link>
        <Link to="/privacy" className="inline-flex min-h-11 items-center rounded-xl border px-4 font-medium hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Privacy policy</Link>
        <Link to="/about-tech-guard" className="inline-flex min-h-11 items-center rounded-xl border px-4 font-medium hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">About the company</Link>
      </nav>

      {loading && <p role="status" className="rounded-xl border p-5">Loading published documents…</p>}
      {error && <div role="alert" className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-5">
        <p>{error}</p>
        <Button type="button" variant="outline" onClick={retry}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Try again</Button>
      </div>}
      {!loading && !error && documents.length === 0 && <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">No published documents available</h2>
        <p className="mt-2 text-sm text-muted-foreground">There are currently no documents published for your account. You can still review the privacy policy.</p>
        <Link to="/privacy" className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary underline">View privacy policy</Link>
      </section>}

      {!!documents.length && !error && (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(230px,300px)_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-2xl border bg-card p-4 sm:p-5" aria-label="Published documents">
            <label htmlFor="legal-document-choice" className="mb-2 block text-sm font-semibold">Choose a document</label>
            <select id="legal-document-choice" className="mb-4 min-h-12 w-full min-w-0 rounded-xl border bg-background px-3 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" value={selected} onChange={event => setSelected(event.target.value)}>
              {Object.entries(LEGAL_CATEGORIES).map(([category, label]) => {
                const items = documents.filter(item => item.category === category);
                return items.length ? <optgroup key={category} label={label}>{items.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</optgroup> : null;
              })}
              {documents.filter(item => !LEGAL_CATEGORIES[item.category]).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <div className="hidden space-y-4 lg:block">
              {Object.entries(LEGAL_CATEGORIES).map(([category, label]) => {
                const items = documents.filter(item => item.category === category);
                return items.length ? <section key={category}>
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</h2>
                  <div className="space-y-1">{items.map(item => <button key={item.id} type="button" onClick={() => setSelected(item.id)} aria-current={item.id === selected ? 'true' : undefined} className={`min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm break-words ${item.id === selected ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'}`}>{item.title}</button>)}</div>
                </section> : null;
              })}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">Only documents your account is permitted to access are listed. Private forms are not public documents.</p>
          </aside>

          {document && <section className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm sm:p-7" aria-labelledby="selected-legal-title">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-5">
              <div className="min-w-0 flex-1">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><FileText className="h-4 w-4" aria-hidden="true" />{LEGAL_CATEGORIES[document.category] || 'Legal document'}</p>
                <h2 id="selected-legal-title" className="break-words text-2xl font-bold sm:text-3xl">{document.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">Version {document.version}{document.updated_at ? ` · Updated ${new Date(document.updated_at).toLocaleDateString('en-ZA')}` : ''}</p>
              </div>
              {document.file_path && <Button type="button" variant="outline" className="min-h-11" onClick={() => downloadLegalFile(supabase, document).catch(() => toast.error('This PDF is unavailable or your access has changed.'))}><Download className="mr-2 h-4 w-4" aria-hidden="true" />PDF</Button>}
            </div>
            {document.content ? <article className="prose prose-sm mt-6 max-w-none break-words dark:prose-invert sm:prose-base"><ReactMarkdown>{document.content}</ReactMarkdown></article> :
              <p className="mt-6 text-sm text-muted-foreground">This document is provided as a PDF. Use the download button to read it.</p>}
            {user && document.document_sha256 && !document.contains_personal_information && <section className="mt-8 space-y-4 border-t pt-6">
              <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-primary" checked={agree} onChange={event => setAgree(event.target.checked)} /><span>I have read this version and agree to record my own acceptance. This does not verify parental consent or guardianship.</span></label>
              <Button type="button" className="min-h-11 w-full sm:w-auto" disabled={!agree || saving} onClick={accept}>{saving ? 'Recording acceptance…' : 'Record my acceptance'}</Button>
            </section>}
          </section>}
        </div>
      )}
    </main>
  );
}
