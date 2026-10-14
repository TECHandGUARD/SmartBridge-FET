import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
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
  useEffect(() => {
    let active = true;
    setDocuments([]); setSelected(''); setLoading(true);
    supabase.from('legal_documents').select('*').eq('is_published', true).order('title').then(({ data, error }) => {
      if (!active) return;
      if (error) setError('Documents could not load. Please try again.');
      else { setError(''); setDocuments(data || []); setSelected(data?.[0]?.id || ''); }
      setLoading(false);
    });
    return () => { active = false; };
  }, [user?.id]);
  useEffect(() => { setAgree(false); }, [selected, documents]);
  const document = documents.find(item => item.id === selected);
  const accept = async () => {
    if (!document) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('accept_legal_document', { document_key: document.doc_key, expected_version: document.version, expected_sha256: document.document_sha256 });
      if (error) throw error;
      toast.success('Your acceptance and document version were recorded.');
    } catch (error) { toast.error(error.message || 'Acceptance could not be recorded.'); }
    finally { setSaving(false); }
  };
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
    <h1 className="text-3xl font-bold">Legal documents</h1>
    <p>SmartBridge FET is operated by TECH AND GUARD (Pty) Ltd · Registration 2026/155090/07.</p>
    {loading && <p role="status">Loading documents…</p>}
    {error && <p role="alert">{error}</p>}
    {!loading && !error && !documents.length && <p>No published documents are available for your account.</p>}
    {!!documents.length && <label>Choose a document<select className="block w-full rounded border bg-background p-3" value={selected} onChange={event => setSelected(event.target.value)}>
      {Object.entries(LEGAL_CATEGORIES).map(([category, label]) => <optgroup key={category} label={label}>{documents.filter(item => item.category === category).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</optgroup>)}
    </select></label>}
    {document && <>
      <h2 className="text-2xl font-semibold">{document.title}</h2>
      <p>Version {document.version}</p>
      {document.file_path && <Button variant="outline" onClick={() => downloadLegalFile(supabase, document).catch(() => toast.error('This file is unavailable or your access has changed.'))}>Download PDF</Button>}
      <article className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{document.content}</ReactMarkdown></article>
      {user && document.document_sha256 && !document.contains_personal_information && <section className="space-y-3 border-t pt-4">
        <label className="flex gap-3"><input type="checkbox" checked={agree} onChange={event => setAgree(event.target.checked)} /><span>I have read this document. This records my own acceptance and does not verify guardianship.</span></label>
        <Button disabled={!agree || saving} onClick={accept}>{saving ? 'Recording…' : 'Record my acceptance'}</Button>
      </section>}
    </>}
  </main>;
}
