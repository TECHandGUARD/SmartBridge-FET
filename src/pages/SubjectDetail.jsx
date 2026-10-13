// src/pages/SubjectDetail.jsx
import { useMemo } from 'react';
// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Feature flags
  ENABLE_BOOKMARKS: import.meta.env.VITE_ENABLE_SUBJECT_BOOKMARKS !== 'false',
  ENABLE_RATINGS: import.meta.env.VITE_ENABLE_SUBJECT_RATINGS !== 'false',
  // Messages
  MESSAGES: {
    LOAD_FAILED: import.meta.env.VITE_SUBJECT_LOAD_FAILED_MSG || 'Failed to load resources. Please try again.',
    NO_RESOURCES: import.meta.env.VITE_SUBJECT_NO_RESOURCES_MSG || 'No resources available for this subject yet.',
    BOOKMARK_ADDED: import.meta.env.VITE_SUBJECT_BOOKMARK_ADDED_MSG || 'Resource bookmarked!',
    BOOKMARK_REMOVED: import.meta.env.VITE_SUBJECT_BOOKMARK_REMOVED_MSG || 'Bookmark removed.',
    BOOKMARK_ERROR: import.meta.env.VITE_SUBJECT_BOOKMARK_ERROR_MSG || 'Failed to update bookmark.',
    SIGN_IN_REQUIRED: import.meta.env.VITE_SUBJECT_SIGN_IN_MSG || 'Sign in to save bookmarks.',
    SUBJECT_NOT_FOUND: import.meta.env.VITE_SUBJECT_NOT_FOUND_MSG || 'Subject not found.',
    BACK_TO_SUBJECTS: import.meta.env.VITE_SUBJECT_BACK_MSG || 'Back to Subjects',
    PREMIUM_LOCKED: import.meta.env.VITE_SUBJECT_PREMIUM_LOCKED_MSG || 'This resource is premium. Upgrade to access it.'
  }
};

// ============================================================
// Type Icons
// ============================================================
import FileLink from '@/components/operations/FileLink';
import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { getSubjectByCode } from '@/lib/subjects';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Lock, ArrowLeft, Star, BookOpen, File, Bookmark, Loader2, Eye, ChevronDown, ChevronUp, Filter, Grid3x3, List, AlertCircle, RefreshCw, Sparkles, Users } from 'lucide-react';
import { toast } from 'sonner';
import ResourceFilter from '@/components/resources/ResourceFilter';
import SubjectTutors from '@/components/subject/SubjectTutors';
import ResourceRatingComponent from '@/components/resources/ResourceRating';
const typeIcons = {
  Notes: BookOpen,
  'Past Paper': FileText,
  Worksheet: File,
  Summary: FileText,
  Textbook: BookOpen,
  Video: Star
};
function ResourceCard({
  resource,
  isBookmarked,
  onToggleBookmark,
  user,
  isPremium
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = typeIcons[resource.type] || FileText;
  return <div className="bg-card border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-foreground">{resource.title}</p>
                {resource.is_premium && <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 text-xs gap-1">
                    <Star className="w-3 h-3 fill-current" /> Premium
                  </Badge>}
                {resource.is_featured && <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 text-[10px]">
                    <Sparkles className="w-2.5 h-2.5" /> Featured
                  </Badge>}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">{resource.grade}</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{resource.type}</span>
                {resource.download_count > 0 && <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Download className="w-2.5 h-2.5" /> {resource.download_count}
                  </span>}
                {resource.view_count > 0 && <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Eye className="w-2.5 h-2.5" /> {resource.view_count}
                  </span>}
              </div>
              {resource.description && <div className="mt-1">
                  <button onClick={() => setExpanded(!expanded)} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">
                    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {expanded ? 'Show less' : 'Show more'}
                  </button>
                  {expanded && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{resource.description}</p>}
                </div>}
              {CONFIG.ENABLE_RATINGS && <div className="mt-1">
                  <ResourceRatingComponent resource={resource} user={user} />
                </div>}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {CONFIG.ENABLE_BOOKMARKS && <Button size="icon" variant="ghost" className={`h-8 w-8 ${isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`} onClick={() => onToggleBookmark(resource)} aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}>
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                </Button>}
              {resource.file_url ? resource.is_premium && !isPremium ? <Link to="/premium">
                    <Button size="sm" variant="outline" className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50">
                      <Lock className="w-3.5 h-3.5" /> Unlock
                    </Button>
                  </Link> : <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-1.5 hover:bg-primary/5">
                      <Download className="w-3.5 h-3.5" /> Download
                    </Button>
                  </a> : null}
            </div>
          </div>
        </div>
      </div>
    </div>;
}
function EmptyState({
  hasFilters,
  onClearFilters
}) {
  return <div className="text-center py-16 bg-card rounded-2xl border border-border">
      <div className="text-5xl mb-4">📂</div>
      <p className="text-lg font-semibold mb-1">No resources yet</p>
      <p className="text-muted-foreground text-sm">
        {hasFilters ? 'Try adjusting your filters.' : 'Tutors will upload resources here soon. Check back later!'}
      </p>
      {hasFilters && <Button variant="outline" size="sm" onClick={onClearFilters} className="mt-4">
          Clear Filters
        </Button>}
    </div>;
}
export default function SubjectDetail() {
  const {
    code
  } = useParams();
  const {
    user
  } = useAuth() || {};
  const subject = getSubjectByCode(code);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [grade, setGrade] = useState('All');
  const [type, setType] = useState('All');
  const [search, setSearch] = useState('');
  const [bookmarked, setBookmarked] = useState(new Set());
  const [viewMode, setViewMode] = useState('list');
  const loadResources = useCallback(async () => {
    if (!subject) return;
    setLoading(true);
    setError(null);
    try {
      const {
        data,
        error: resourcesError
      } = await supabase.from('resources').select('*').eq('subject', subject.name).eq('is_approved', true).order('created_at', {
        ascending: false
      });
      if (resourcesError) throw resourcesError;
      setResources(data || []);
      if (CONFIG.ENABLE_BOOKMARKS && user?.email) {
        const {
          data: bookmarkData,
          error: bookmarkError
        } = await supabase.from('resource_bookmarks').select('resource_id').eq('user_email', user.email);
        if (!bookmarkError && bookmarkData) {
          setBookmarked(new Set(bookmarkData.map(b => b.resource_id)));
        }
      }
    } catch (err) {
      console.error('Error loading resources:', err);
      setError(CONFIG.MESSAGES.LOAD_FAILED);
      toast.error(CONFIG.MESSAGES.LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  }, [subject, user?.email]);
  useEffect(() => {
    loadResources();
  }, [loadResources]);
  const toggleBookmark = async resource => {
    if (!user) {
      toast.error(CONFIG.MESSAGES.SIGN_IN_REQUIRED);
      return;
    }
    try {
      if (bookmarked.has(resource.id)) {
        const {
          error
        } = await supabase.from('resource_bookmarks').delete().eq('user_email', user.email).eq('resource_id', resource.id);
        if (error) throw error;
        setBookmarked(prev => {
          const n = new Set(prev);
          n.delete(resource.id);
          return n;
        });
        toast.success(CONFIG.MESSAGES.BOOKMARK_REMOVED);
      } else {
        const {
          error
        } = await supabase.from('resource_bookmarks').insert({
          user_email: user.email,
          resource_id: resource.id,
          resource_title: resource.title,
          subject: resource.subject,
          grade: resource.grade,
          created_at: new Date().toISOString()
        });
        if (error) throw error;
        setBookmarked(prev => new Set([...prev, resource.id]));
        toast.success(CONFIG.MESSAGES.BOOKMARK_ADDED);
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      toast.error(CONFIG.MESSAGES.BOOKMARK_ERROR);
    }
  };
  const clearFilters = () => {
    setSearch('');
    setGrade('All');
    setType('All');
  };
  const filtered = useMemo(() => {
    return resources.filter(r => {
      const matchGrade = grade === 'All' || r.grade === grade;
      const matchType = type === 'All' || r.type === type;
      const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase());
      return matchGrade && matchType && matchSearch;
    });
  }, [resources, grade, type, search]);
  const hasFilters = search.trim() || grade !== 'All' || type !== 'All';
  const totalDownloads = filtered.reduce((sum, r) => sum + (r.download_count || 0), 0);
  const isPremium = user?.is_premium === true || user?.role === 'admin';
  const colorClasses = subject?.color?.split(' ') || ['bg-primary', 'text-primary-foreground'];
  if (loading) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground animate-pulse">Loading resources...</p>
      </div>;
  }
  if (!subject) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold mb-2">{CONFIG.MESSAGES.SUBJECT_NOT_FOUND}</p>
          <Link to="/subjects">
            <Button variant="outline">{CONFIG.MESSAGES.BACK_TO_SUBJECTS}</Button>
          </Link>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {}
        <Link to="/subjects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          {CONFIG.MESSAGES.BACK_TO_SUBJECTS}
        </Link>

        {}
        <div className={`rounded-2xl p-8 mb-8 bg-gradient-to-br ${colorClasses[0]} to-card border ${colorClasses[2] || 'border-border'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-2xl ${colorClasses.slice(0, 2).join(' ')} flex items-center justify-center text-3xl flex-shrink-0`}>
              {subject.icon}
            </div>
            <div className="flex-1">
              <h1 className="font-playfair text-3xl font-bold text-foreground mb-1">{subject.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">{subject.category}</Badge>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Users className="w-3 h-3" /> {filtered.length} resources
                </span>
              </div>
              <p className="text-muted-foreground">{subject.description}</p>
            </div>
          </div>
        </div>

        {}
        <ResourceFilter search={search} setSearch={setSearch} grade={grade} setGrade={setGrade} type={type} setType={setType} />

        {}
        <div className="flex items-center justify-between mt-4 mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {filtered.length} resource{filtered.length !== 1 ? 's' : ''} found
            </p>
            {totalDownloads > 0 && <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Download className="w-3 h-3" /> {totalDownloads} downloads
              </span>}
            {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <Filter className="w-3 h-3" /> Clear
              </Button>}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={viewMode === 'list' ? 'default' : 'ghost'} onClick={() => setViewMode('list')} className="h-7 w-7 p-0" aria-label="List view">
              <List className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant={viewMode === 'grid' ? 'default' : 'ghost'} onClick={() => setViewMode('grid')} className="h-7 w-7 p-0" aria-label="Grid view">
              <Grid3x3 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {}
        {error && <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 flex items-center gap-3 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <Button variant="outline" size="sm" onClick={loadResources} className="gap-1">
              <RefreshCw className="w-3 h-3" /> Retry
            </Button>
          </div>}

        {}
        {filtered.length === 0 ? <div className="text-center py-16 bg-card rounded-2xl border border-border">
            <div className="text-5xl mb-4">📂</div>
            <p className="text-lg font-semibold mb-1">No resources yet</p>
            <p className="text-muted-foreground text-sm">Tutors will upload resources here soon. Check back later!</p>
          </div> : <div className="space-y-3">
            {filtered.map(resource => {
          const Icon = typeIcons[resource.type] || FileText;
          return <div key={resource.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">{resource.title}</p>
                      {resource.is_premium && <Badge className="bg-secondary/20 text-amber-700 border-amber-200 text-xs gap-1">
                          <Star className="w-3 h-3 fill-current" /> Premium
                        </Badge>}
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
                    {resource.file_url ? resource.is_premium ? <Link to="/premium">
                          <Button size="sm" variant="outline" className="gap-1.5 text-amber-600 border-amber-200">
                            <Lock className="w-3.5 h-3.5" /> Unlock
                          </Button>
                        </Link> : <FileLink reference={resource.file_url}>
                          <span>
                            <Download className="w-3.5 h-3.5" /> Download
                          </span>
                        </FileLink> : null}
                  </div>
                </div>;
        })}
          </div>}

        {}
        <SubjectTutors subjectName={subject.name} />
      </div>
    </div>;
}
