import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { Link, useOutletContext } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Lock, Star, BookOpen, FileText, File, Bookmark } from 'lucide-react';
import { SUBJECTS } from '@/lib/subjects';
import { toast } from 'sonner';

const typeIcons = { Notes: BookOpen, 'Past Paper': FileText, Worksheet: File, Summary: FileText, Textbook: BookOpen };

export default function ResourceSearch() {
  const { user } = useOutletContext() || {};
  const [query, setQuery] = useState('');
  const [resources, setResources] = useState([]);
  const [bookmarked, setBookmarked] = useState(new Set());
  const [subject, setSubject] = useState('All');
  const [grade, setGrade] = useState('All');
  const [type, setType] = useState('All');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (user?.email) {
      fetchBookmarks();
    }
  }, [user]);

  const fetchBookmarks = async () => {
    try {
      const { data, error } = await supabase
        .from('resource_bookmarks')
        .select('resource_id')
        .eq('user_email', user.email);
      
      if (error) throw error;
      setBookmarked(new Set(data?.map(b => b.resource_id) || []));
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  const search = async () => {
    setLoading(true);
    setSearched(true);
    
    try {
      let queryBuilder = supabase
        .from('resources')
        .select('*')
        .eq('is_approved', true);
      
      if (subject !== 'All') {
        queryBuilder = queryBuilder.eq('subject', subject);
      }
      if (grade !== 'All') {
        queryBuilder = queryBuilder.eq('grade', grade);
      }
      if (type !== 'All') {
        queryBuilder = queryBuilder.eq('type', type);
      }
      
      let { data, error } = await queryBuilder.order('created_at', { ascending: false }).limit(100);
      
      if (error) throw error;
      
      let results = data || [];
      
      // Apply text search client-side (or you could use Supabase full-text search)
      const q = query.toLowerCase();
      if (q) {
        results = results.filter(r => 
          r.title?.toLowerCase().includes(q) || 
          r.description?.toLowerCase().includes(q) || 
          r.subject?.toLowerCase().includes(q)
        );
      }
      
      setResources(results);
    } catch (error) {
      console.error('Error searching resources:', error);
      toast.error('Failed to search resources');
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = async (resource) => {
    if (!user) { toast.error('Sign in to bookmark resources.'); return; }
    
    try {
      if (bookmarked.has(resource.id)) {
        // Delete bookmark
        const { data, error } = await supabase
          .from('resource_bookmarks')
          .delete()
          .eq('user_email', user.email)
          .eq('resource_id', resource.id);
        
        if (error) throw error;
        setBookmarked(prev => { const n = new Set(prev); n.delete(resource.id); return n; });
        toast.success('Bookmark removed');
      } else {
        // Create bookmark
        const { error } = await supabase
          .from('resource_bookmarks')
          .insert({
            user_email: user.email,
            resource_id: resource.id,
            resource_title: resource.title,
            subject: resource.subject,
            grade: resource.grade,
          });
        
        if (error) throw error;
        setBookmarked(prev => new Set([...prev, resource.id]));
        toast.success('Bookmarked!');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to bookmark resource');
    }
  };

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-playfair text-3xl font-bold mb-1 flex items-center gap-2">
            <Search className="w-7 h-7 text-primary" /> Study Resource Search
          </h1>
          <p className="text-muted-foreground">Search across all CAPS-aligned resources uploaded by verified tutors.</p>
        </div>

        {/* Search bar */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-6 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by title, subject, topic..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
              />
            </div>
            <Button onClick={search} className="bg-primary gap-1.5" disabled={loading}>
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Subjects</SelectItem>
                {SUBJECTS.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Grade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Grades</SelectItem>
                <SelectItem value="Grade 10">Grade 10</SelectItem>
                <SelectItem value="Grade 11">Grade 11</SelectItem>
                <SelectItem value="Grade 12">Grade 12</SelectItem>
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                {['Notes','Past Paper','Worksheet','Summary','Textbook','Video'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        {searched && (
          <div>
            <p className="text-sm text-muted-foreground mb-3">{resources.length} result{resources.length !== 1 ? 's' : ''} found</p>
            <div className="space-y-2">
              {resources.map(r => {
                const Icon = typeIcons[r.type] || FileText;
                const sub = SUBJECTS.find(s => s.name === r.subject);
                return (
                  <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{r.title}</p>
                        {r.is_premium && <Badge className="bg-amber-100 text-amber-700 text-xs gap-0.5"><Star className="w-3 h-3 fill-current" /> Premium</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs">{sub?.icon} {r.subject}</span>
                        <span className="text-xs text-muted-foreground">{r.grade} • {r.type}</span>
                        {r.description && <span className="text-xs text-muted-foreground truncate max-w-48">{r.description}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button size="icon" variant="ghost" className={`h-8 w-8 ${bookmarked.has(r.id) ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => toggleBookmark(r)}>
                        <Bookmark className={`w-4 h-4 ${bookmarked.has(r.id) ? 'fill-current' : ''}`} />
                      </Button>
                      {r.file_url ? (
                        r.is_premium ? (
                          <Link to="/premium"><Button size="sm" variant="outline" className="text-amber-600 border-amber-200 h-7 text-xs gap-1"><Lock className="w-3 h-3" /> Unlock</Button></Link>
                        ) : (
                          <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"><Download className="w-3 h-3" /> Get</Button>
                          </a>
                        )
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {resources.length === 0 && (
                <div className="text-center py-12 bg-card rounded-2xl border border-border">
                  <Search className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="font-semibold mb-1">No resources found</p>
                  <p className="text-sm text-muted-foreground">Try different keywords or adjust the filters.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {!searched && (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Enter a search term or select filters, then press Search.</p>
          </div>
        )}
      </div>
    </div>
  );
}