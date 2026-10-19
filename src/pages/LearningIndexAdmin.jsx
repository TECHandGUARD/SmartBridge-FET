import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LearningIndexAdmin() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [messages, setMessages] = useState({});

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from('educational_resources').select('id,title,subject,grade,resource_url,is_active').eq('is_active', true).limit(200),
      supabase.from('caps_documents').select('id,title,subject,grade,file_url,is_active').eq('is_active', true).limit(200)
    ]).then(([a,b]) => {
      if (!active) return;
      if (a.error || b.error) throw a.error || b.error;
      const docs = [
        ...(a.data || []).map(d => ({ ...d, source_type: 'educational_resources', ref: d.resource_url })),
        ...(b.data || []).map(d => ({ ...d, source_type: 'caps_documents', ref: d.file_url }))
      ];
      setDocuments(docs);
      setLoading(false);
    }).catch(() => { if (active) { setMessages({ error: 'Could not load educational documents.' }); setLoading(false); } });
    return () => { active = false; };
  }, []);

  async function indexDocument(doc) {
    const key = doc.source_type + ':' + doc.id;
    setWorking(key);
    setMessages(prev => ({ ...prev, [key]: 'Indexing pages…' }));
    try {
      let page = 1;
      let chunks = 0;
      for (let batch = 0; batch < 40; batch++) {
        const { data, error } = await supabase.functions.invoke('index-learning-documents', {
          body: { source_type: doc.source_type, source_id: doc.id, start_page: page }
        });
        if (error || !data || data.error) throw new Error(data?.error || error?.message || 'Indexing failed');
        chunks += data.chunks_indexed || 0;
        setMessages(prev => ({ ...prev, [key]: `Indexed ${chunks} passages through page ${page + data.pages_indexed - 1}.` }));
        if (data.complete) {
          setMessages(prev => ({ ...prev, [key]: `Complete: ${chunks} passages. ${chunks === 0 ? 'PDF may contain scanned pages; manual text review is required.' : ''}` }));
          return;
        }
        if (!Number.isInteger(data.next_page) || data.next_page <= page) throw new Error('Invalid page continuation');
        page = data.next_page;
      }
      throw new Error('Indexing paused at maximum supported page count.');
    } catch (error) {
      setMessages(prev => ({ ...prev, [key]: `Failed: ${error.message}` }));
    } finally { setWorking(''); }
  }

  return <main className="mx-auto max-w-5xl px-4 py-10 space-y-5">
    <h1 className="text-2xl font-bold">Learning document indexing</h1>
    <p className="text-sm text-muted-foreground">Admin-only. Index approved PDFs to make their text searchable by the study assistant. Review copyright and document quality before indexing. Scanned image-only PDFs require separate text extraction.</p>
    {loading ? <p>Loading documents…</p> : <div className="space-y-3">{documents.map(doc => {
      const key = doc.source_type + ':' + doc.id;
      const supported = typeof doc.ref === 'string' && doc.ref.startsWith('storage://');
      return <section key={key} className="rounded-xl border p-4 flex flex-wrap justify-between gap-4">
        <div className="min-w-0 flex-1"><h2 className="font-semibold">{doc.title}</h2><p className="text-sm text-muted-foreground">{doc.subject || 'Unspecified subject'} · {doc.grade || 'Unspecified grade'} · {doc.source_type}</p>
          {messages[key] && <p className="mt-2 text-sm" role="status">{messages[key]}</p>}
          {!supported && <p className="text-sm text-amber-700">Requires a managed Storage PDF before indexing.</p>}
        </div>
        <button className="rounded-lg border px-4 py-2 disabled:opacity-50" type="button" disabled={!supported || !!working} onClick={() => indexDocument(doc)}>{working === key ? 'Indexing…' : 'Index PDF'}</button>
      </section>;
    })}{!documents.length && <p>No active educational documents found.</p>}</div>}
    {messages.error && <p role="alert">{messages.error}</p>}
  </main>;
}
