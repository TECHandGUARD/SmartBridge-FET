import { useCallback, useEffect, useState } from 'react';
import { BookOpen, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import FileLink from '@/components/operations/FileLink';

export default function KnowledgeBookShelf() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: failure } = await supabase.from('educational_resources')
        .select('id,title,subject,grade,resource_url').eq('is_active', true)
        .order('title').limit(200).abortSignal(signal);
      if (signal.aborted) return;
      if (failure) throw failure;
      setBooks(data || []);
    } catch {
      if (!signal.aborted) setError(true);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, retry]);
  return <section className="knowledge-books" aria-label="Knowledge-base books">
    <div className="knowledge-books-heading"><BookOpen size={23} aria-hidden="true" /><div><h2>Go deeper with the source books</h2><p>Publisher books used by the knowledge base, with their original titles and attribution.</p></div></div>
    {loading ? <p role="status">Loading source books…</p> : error ? <div role="alert"><p>Source books could not be loaded. You can still use the visual guides above.</p><button className="learn-clear" type="button" onClick={() => setRetry(n => n + 1)}><RefreshCw size={15} /> Retry source books</button></div> : books.length ? <details><summary>Browse {books.length} source {books.length === 1 ? 'book' : 'books'}</summary><div className="knowledge-books-grid">{books.map(book => <article key={book.id}><span>{book.grade} · {book.subject}</span><h3>{book.title}</h3>{book.resource_url && <FileLink reference={book.resource_url}>Open source book</FileLink>}</article>)}</div></details> : <p>No source books are currently available.</p>}
    <p className="knowledge-books-note">AI explanations can retrieve indexed text passages; uploading a book does not guarantee every page is indexed. Check the sources and page references in each answer. <Link to="/student-dashboard?section=ai">Open premium AI study tools →</Link></p>
  </section>;
}
