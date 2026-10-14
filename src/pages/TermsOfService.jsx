import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import documents from '../../legal/legal-documents.json';
import { toast } from 'sonner';

export default function TermsOfService() {
  const { user } = useAuth();
  const [selected, setSelected] = useState('terms_service');
  const [published, setPublished] = useState([]);
  const [agree, setAgree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    supabase.from('legal_documents').select('doc_key,content,version,document_sha256,is_published').eq('is_published', true).then(({ data, error }) => {
      if (!active) return;
      if (error) setError('Published documents could not load. The review copies below remain available.');
      else setPublished(data || []);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => { setAgree(false); }, [selected]);
  const source = documents.find(item => item.key === selected);
  const document = useMemo(() => {
    const live = published.find(item => item.doc_key === selected);
    return live ? { ...source, content: live.content, version: live.version, sha256: live.document_sha256, isPublished: true } : source;
  }, [published, selected, source]);
  const accept = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc('accept_legal_document', { document_key: selected, expected_version: document.version, expected_sha256: document.sha256 });
      if (error) throw error;
      toast.success('Your acceptance and document version were recorded.');
    } catch (error) { toast.error(error.message || 'Acceptance could not be recorded.'); }
    finally { setSaving(false); }
  };
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
    <h1 className="text-3xl font-bold">Terms, policies and downloadable forms</h1>
    <p>Review the general terms and the documents for your role. Completed forms contain personal information: retain a copy and submit only through an approved secure support process.</p>
    {error && <p role="alert">{error}</p>}
    <Label htmlFor="legal-document">Choose a document</Label>
    <select id="legal-document" className="w-full rounded border bg-background p-3" value={selected} onChange={event => setSelected(event.target.value)}>
      {documents.map(item => <option key={item.key} value={item.key}>{item.title}{item.fillable ? ' — fillable form' : ''}</option>)}
    </select>
    <p className="font-semibold">Version {document.version} · {document.isPublished ? 'Published' : 'Draft for review; not an activated contract'}</p>
    <div className="flex flex-wrap gap-3">
      {document.version === source.version && <Button asChild variant="outline"><a href={source.pdf} download>Download {source.fillable ? 'fillable form' : 'PDF'}</a></Button>}
      <Button type="button" variant="outline" onClick={() => window.print()}>Print this document</Button>
    </div>
    <article className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{document.content}</ReactMarkdown></article>
    {document.isPublished && user && document.sha256 && !source.fillable && <section className="space-y-3 border-t pt-4">
      <label className="flex items-start gap-3"><input type="checkbox" checked={agree} onChange={event => setAgree(event.target.checked)} /><span>I have read this document, including the fees, cancellation policy and liability notices. This records my own acceptance; it does not verify guardianship.</span></label>
      <Button disabled={!agree || saving} onClick={accept}>{saving ? 'Recording…' : 'Record my acceptance'}</Button>
    </section>}
  </main>;
}
