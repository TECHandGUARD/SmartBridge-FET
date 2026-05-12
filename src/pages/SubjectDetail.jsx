import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { getSubjectByCode } from '@/lib/subjects';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Lock, ArrowLeft, Star, BookOpen, File, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import ResourceFilter from '@/components/resources/ResourceFilter';
import SubjectTutors from '@/components/subject/SubjectTutors';
import ResourceRatingComponent from '@/components/resources/ResourceRating';
import { useOutletContext } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const typeIcons = {
  Notes: BookOpen,
  'Past Paper': FileText,
  Worksheet: File,
  Summary: FileText,
  Textbook: BookOpen,
  Video: Star,
};

export default function SubjectDetail() {
  const { code } = useParams();
  const { user } = useOutletContext() || {};
  const subject = getSubjectByCode(code);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grade, setGrade] = useState('All');
  const [type, setType] = useState('All');
  const [search, setSearch] = useState('');
  const [bookmarked, setBookmarked] = useState(new Set());

  useEffect(() => {
    if (!subject) return;
    
    const fetchResources = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('resources')
          .select('*')
          .eq('subject', subject.name)
          .eq('is_approved', true);
        
        if (error) throw error;
        setResources(data || []);
      } catch (error) {
        console.error('Error fetching resources:', error);
        toast.error('Failed to load resources');
      } finally {
        setLoading(false);
      }
    };
    
    fetchResources();
    
    if (user?.email) {
      fetchBookmarks();
    }
  }, [subject, user]);

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

  if (!subject) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-bold mb-2">Subject not found</p>
        <Link to="/subjects"><Button variant="outline">Back to Subjects</Button></Link>
      </div>
    </div>
  );

  const filtered = resources.filter((r) => {
    const matchGrade = grade === 'All' || r.grade === grade;
    const matchType = type === 'All' || r.type === type;
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase());
    return matchGrade && matchType && matchSearch;
  });

  const colorClasses = subject.color.split(' ');

  const toggleBookmark = async (resource) => {
    if (!user) { toast.error('Sign in to save bookmarks.'); return; }
    
    try {
      if (bookmarked.has(resource.id)) {
        const { error } = await supabase
          .from('resource_bookmarks')
          .delete()
          .eq('user_email', user.email)
          .eq('resource_id', resource.id);
        
        if (error) throw error;
        setBookmarked(prev => { const n = new Set(prev); n.delete(resource.id); return n; });
        toast.success('Bookmark removed.');
      } else {
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
        toast.success('Resource bookmarked!');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to bookmark resource');
    }
  };

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back */}
        <Link to="/subjects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Subjects
        </Link>

        {/* Header */}
        <div className={`rounded-2xl p-8 mb-8 bg-gradient-to-br ${colorClasses[0]} to-card border ${colorClasses[2] || 'border-border'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-2xl ${colorClasses.slice(0,2).join(' ')} flex items-center justify-center text-3xl flex-shrink-0`}>
              {subject.icon}
            </div>
            <div>
              <h1 className="font-playfair text-3xl font-bold text-foreground mb-1">{subject.name}</h1>
              <Badge variant="secondary" className="mb-2">{subject.category}</Badge>
              <p className="text-muted-foreground">{subject.description}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <ResourceFilter search={search} setSearch={setSearch} grade={grade} setGrade={setGrade} type={type} setType={setType} />

        {/* Resources */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border">
            <div className="text-5xl mb-4">📂</div>
            <p className="text-lg font-semibold mb-1">No resources yet</p>
            <p className="text-muted-foreground text-sm">Tutors will upload resources here soon. Check back later!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((resource) => {
              const Icon = typeIcons[resource.type] || FileText;
              return (
                <div key={resource.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">{resource.title}</p>
                      {resource.is_premium && (
                        <Badge className="bg-secondary/20 text-amber-700 border-amber-200 text-xs gap-1">
                          <Star className="w-3 h-3 fill-current" /> Premium
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">{resource.grade}</span>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{resource.type}</span>
                      {resource.description && <span className="text-xs text-muted-foreground truncate">{resource.description}</span>}
                    </div>
                    <div className="mt-1">
                      <ResourceRatingComponent resource={resource} user={user} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button size="icon" variant="ghost" className={`h-8 w-8 ${bookmarked.has(resource.id) ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`} onClick={() => toggleBookmark(resource)}>
                      <Bookmark className={`w-4 h-4 ${bookmarked.has(resource.id) ? 'fill-current' : ''}`} />
                    </Button>
                    {resource.file_url ? (
                      resource.is_premium ? (
                        <Link to="/premium">
                          <Button size="sm" variant="outline" className="gap-1.5 text-amber-600 border-amber-200">
                            <Lock className="w-3.5 h-3.5" /> Unlock
                          </Button>
                        </Link>
                      ) : (
                        <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="gap-1.5">
                            <Download className="w-3.5 h-3.5" /> Download
                          </Button>
                        </a>
                      )
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <SubjectTutors subjectName={subject.name} />
      </div>
    </div>
  );
}