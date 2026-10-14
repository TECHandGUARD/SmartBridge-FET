import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LEGAL_BUCKET, LEGAL_CATEGORIES, LEGAL_AUDIENCES, validateLegalPdf, downloadLegalFile } from '@/lib/legal-files';

const emptyDocument = () => ({ id: '', doc_key: '', title: '', content: '', version: '1.0', category: 'policy', audience: 'admin', owner_user_id: '', contains_personal_information: false, is_published: false, file_path: null, file_sha256: null, revision: 1 });
export default function LegalDocumentsPanel() {
  const [documents, setDocuments] = useState([]);
  const [draft, setDraft] = useState(emptyDocument);
  const [file, setFile] = useState(null);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('legal_documents').select('*').order('title');
    if (error) { setError('Documents could not load. Please retry.'); return; }
    setDocuments(data || []); setError('');
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let active = true;
    setOwnerEmail('');
    if (draft.owner_user_id) supabase.from('users').select('email').eq('id', draft.owner_user_id).single().then(({ data, error }) => {
      if (!active) return;
      if (error) toast.error('The assigned account could not load. Enter its email before saving.');
      else setOwnerEmail(data?.email || '');
    });
    return () => { active = false; };
  }, [draft.owner_user_id, fileInputKey]);
  const edit = (document) => { setDraft({ ...document, owner_user_id: document.owner_user_id || '' }); setFile(null); setFileInputKey(value => value + 1); };
  const set = (field, value) => setDraft(current => ({ ...current, [field]: value }));
  const save = async (event) => {
    event.preventDefault(); setBusy(true);
    let uploadedPath = null;
    let committed = false;
    try {
      if (!draft.title.trim() || !draft.doc_key.trim() || !draft.version.trim()) throw new Error('Title, document key and version are required.');
      let ownerId = null;
      if (draft.audience === 'owner') {
        if (!ownerEmail.trim()) throw new Error('Enter the registered email for this document.');
        const { data, error } = await supabase.from('users').select('id').eq('email', ownerEmail.trim().toLowerCase()).single();
        if (error || !data?.id) throw new Error('A registered account with that email could not be found.');
        ownerId = data.id;
      }
      if (draft.contains_personal_information && !['owner', 'admin'].includes(draft.audience)) throw new Error('Confidential forms must be limited to a specific user or admins.');
      let filePath = draft.file_path;
      let fileHash = draft.file_sha256;
      if (file) {
        fileHash = await validateLegalPdf(file);
        filePath = crypto.randomUUID() + '.pdf';
        const { error } = await supabase.storage.from(LEGAL_BUCKET).upload(filePath, file, { contentType: 'application/pdf', upsert: false, cacheControl: '0' });
        if (error) throw error;
        uploadedPath = filePath;
      }
      const values = { doc_key: draft.doc_key.trim(), title: draft.title.trim(), content: draft.content, version: draft.version.trim(), category: draft.category, audience: draft.audience, owner_user_id: ownerId, contains_personal_information: draft.contains_personal_information, is_published: draft.is_published, file_path: filePath, file_sha256: fileHash };
      const query = draft.id ? supabase.from('legal_documents').update(values).eq('id', draft.id).eq('revision', draft.revision) : supabase.from('legal_documents').insert(values);
      const { data, error } = await query.select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('This document changed. Reload it before saving.');
      committed = true;
      if (draft.file_path && draft.file_path !== filePath) {
        const { error } = await supabase.storage.from(LEGAL_BUCKET).remove([draft.file_path]);
        if (error) toast.error('Saved. The old file needs administrator cleanup; users cannot access it.');
      }
      edit(emptyDocument()); await load(); toast.success('Document saved.');
    } catch (error) {
      if (uploadedPath && !committed) {
        const { error: cleanupError } = await supabase.storage.from(LEGAL_BUCKET).remove([uploadedPath]);
        if (cleanupError) toast.error('An unattached upload needs administrator cleanup.');
      }
      toast.error(error.message || 'Document could not be saved.');
    } finally { setBusy(false); }
  };
  const remove = async (document) => {
    if (!window.confirm('Delete "' + document.title + '"? Its acceptance history will be retained.')) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.from('legal_documents').delete().eq('id', document.id).eq('revision', document.revision).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('This document changed. Refresh before deleting.');
      if (document.file_path) {
        const { error } = await supabase.storage.from(LEGAL_BUCKET).remove([document.file_path]);
        if (error) toast.error('Document removed from access. The stored file needs administrator cleanup.');
      }
      if (draft.id === document.id) edit(emptyDocument());
      await load(); toast.success('Document deleted.');
    } catch (error) { toast.error(error.message || 'Deletion failed.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-6">
    <h2 className="text-2xl font-semibold">Legal documents</h2>
    <p>Manage agreements, compliance documents, terms and policies. Publish to the selected audience. Completed forms containing personal details must be private.</p>
    {error && <p role="alert">{error}</p>}
    <Button disabled={busy} onClick={load}>Refresh</Button>
    <Button disabled={busy} onClick={() => edit(emptyDocument())}>New document</Button>
    <form onSubmit={save} className="grid gap-4 rounded border p-4">
      <label>Title<input required className="block w-full rounded border bg-background p-2" value={draft.title} onChange={event => set('title', event.target.value)} /></label>
      <label>Document key<input required disabled={!!draft.id} className="block w-full rounded border bg-background p-2" value={draft.doc_key} onChange={event => set('doc_key', event.target.value)} /></label>
      <label>Version<input aria-label="Version" required className="block w-full rounded border bg-background p-2" value={draft.version} onChange={event => set('version', event.target.value)} /><span className="text-sm">Use a new version when changing text or replacing a file.</span></label>
      <label>Category<select aria-label="Category" className="block w-full rounded border bg-background p-2" value={draft.category} onChange={event => set('category', event.target.value)}>{Object.entries(LEGAL_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Who can view this document?<select aria-label="Who can view this document?" className="block w-full rounded border bg-background p-2" value={draft.audience} onChange={event => set('audience', event.target.value)}>{Object.entries(LEGAL_AUDIENCES).filter(([key]) => !draft.contains_personal_information || ['owner','admin'].includes(key)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label><input type="checkbox" checked={draft.contains_personal_information} onChange={event => setDraft(current => ({ ...current, contains_personal_information: event.target.checked, audience: event.target.checked ? 'admin' : current.audience }))} /> Contains personal information / completed form</label>
      {draft.audience === 'owner' && <label>Registered user email<input required type="email" className="block w-full rounded border bg-background p-2" value={ownerEmail} onChange={event => setOwnerEmail(event.target.value)} /></label>}
      <label>Document text<textarea className="block min-h-40 w-full rounded border bg-background p-2" value={draft.content} onChange={event => set('content', event.target.value)} /></label>
      <label>{draft.file_path ? 'Replace PDF' : 'Upload PDF'} (up to 10 MB)<input key={fileInputKey} type="file" accept="application/pdf,.pdf" onChange={event => setFile(event.target.files?.[0] || null)} /></label>
      <label><input type="checkbox" checked={draft.is_published} onChange={event => set('is_published', event.target.checked)} /> Published to selected audience</label>
      <Button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save document'}</Button>
    </form>
    {Object.entries(LEGAL_CATEGORIES).map(([category, label]) => <section key={category} className="space-y-3">
      <h3 className="text-xl font-semibold">{label}</h3>
      {documents.filter(document => document.category === category).map(document => <div key={document.id} className="flex flex-wrap items-center gap-3 rounded border p-3">
        <span className="flex-1">{document.title} · {document.version} · {LEGAL_AUDIENCES[document.audience]} · {document.is_published ? 'Published' : 'Draft'}</span>
        <Button disabled={busy} variant="outline" onClick={() => edit(document)}>Edit</Button>
        {document.file_path && <Button disabled={busy} variant="outline" onClick={() => downloadLegalFile(supabase, document).catch(() => toast.error('Download failed.'))}>Download</Button>}
        <Button disabled={busy} variant="destructive" onClick={() => remove(document)}>Delete</Button>
      </div>)}
    </section>)}
  </section>;
}
