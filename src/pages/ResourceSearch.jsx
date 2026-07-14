// src/pages/ResourceSearch.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Link, useOutletContext } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, Download, Lock, Star, BookOpen, FileText, File, Bookmark,
  Loader2, Filter, X, Grid3x3, List, ChevronDown, ChevronUp,
  AlertCircle, RefreshCw, Sparkles, TrendingUp, Clock, Eye
} from 'lucide-react';
import PremiumBadge from '@/components/ui/PremiumBadge';
import usePremiumAccess from '@/hooks/usePremiumAccess';
import TrialBanner from '@/components/ui/TrialBanner';
import { SUBJECTS } from '@/lib/subjects';
import { toast } from 'sonner';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Resource types
  RESOURCE_TYPES: (import.meta.env.VITE_RESOURCE_TYPES || 
    'Notes,Past Paper,Worksheet,Summary,Textbook,Video'
  ).split(',').map(t => t.trim()),

  // Grades
  GRADES: (import.meta.env.VITE_RESOURCE_GRADES || 
    'All,Grade 10,Grade 11,Grade 12'
  ).split(',').map(g => g.trim()),

  // Pagination
  RESULTS_PER_PAGE: Number(import.meta.env.VITE_RESOURCE_SEARCH_RESULTS) || 50,

  // Feature flags
  ENABLE_BOOKMARKS: import.meta.env.VITE_ENABLE_RESOURCE_BOOKMARKS !== 'false',
  ENABLE_PREMIUM_FILTER: import.meta.env.VITE_ENABLE_PREMIUM_FILTER !== 'false',

  // Messages
  MESSAGES: {
    NO_RESULTS: import.meta.env.VITE_RESOURCE_NO_RESULTS_MSG || 'No resources found matching your criteria.',
    SEARCH_ERROR: import.meta.env.VITE_RESOURCE_SEARCH_ERROR_MSG || 'Failed to search resources. Please try again.',
    BOOKMARK_ADDED: import.meta.env.VITE_RESOURCE_BOOKMARK_ADDED_MSG || 'Resource bookmarked!',
    BOOKMARK_REMOVED: import.meta.env.VITE_RESOURCE_BOOKMARK_REMOVED_MSG || 'Bookmark removed.',
    BOOKMARK_ERROR: import.meta.env.VITE_RESOURCE_BOOKMARK_ERROR_MSG || 'Failed to update bookmark.',
    SIGN_IN_REQUIRED: import.meta.env.VITE_RESOURCE_SIGN_IN_MSG || 'Sign in to bookmark resources.',
    AWAITING_SEARCH: import.meta.env.VITE_RESOURCE_AWAITING_MSG || 'Enter a search term or select filters, then press Search.',
    PREMIUM_LOCKED: import.meta.env.VITE_RESOURCE_PREMIUM_LOCKED_MSG || 'This resource is premium. Upgrade to access it.',
  },
};

// ============================================================
// Type Icons
// ============================================================

const typeIcons = {
  Notes: BookOpen,
  'Past Paper': FileText,
  Worksheet: File,
  Summary: FileText,
  Textbook: BookOpen,
  Video: FileText,
};

// ============================================================
// Sub-Components
// ============================================================

function ResourceCard({ resource, isBookmarked, onToggleBookmark, isPremium, icon: Icon }) {
  const [expanded, setExpanded] = useState(false);
  const sub = SUBJECTS.find(s => s.name === resource.subject);

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm truncate">{resource.title}</p>
                {resource.is_premium && <PremiumBadge variant="badge" />}
                {resource.is_featured && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                    <Star className="w-2.5 h-2.5 fill-current" /> Featured
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs">{sub?.icon} {resource.subject}</span>
                <span className="text-xs text-muted-foreground">{resource.grade} • {resource.type}</span>
                {resource.download_count > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Download className="w-2.5 h-2.5" /> {resource.download_count}
                  </span>
                )}
                {resource.view_count > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Eye className="w-2.5 h-2.5" /> {resource.view_count}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {CONFIG.ENABLE_BOOKMARKS && (
                <Button
                  size="icon"
                  variant="ghost"
                  className={`h-8 w-8 ${isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                  onClick={() => onToggleBookmark(resource)}
                  aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                </Button>
              )}
              {resource.file_url ? (
                resource.is_premium && !isPremium ? (
                  <Link to="/premium">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-amber-600 border-amber-200 hover:bg-amber-50">
                      <Lock className="w-3 h-3" /> Unlock
                    </Button>
                  </Link>
                ) : (
                  <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 hover:bg-primary/5">
                      <Download className="w-3 h-3" /> Download
                    </Button>
                  </a>
                )
              ) : null}
            </div>
          </div>
          {resource.description && (
            <div className="mt-1">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? 'Show less' : 'Show more'}
              </button>
              {expanded && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{resource.description}</p>
              )}
            </div>
          )}
          {resource.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {resource.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px] font-normal">
                  #{tag}
                </Badge>
              ))}
              {resource.tags.length > 3 && (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  +{resource.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function ResourceSearch() {
  const { user } = useOutletContext() || {};
  const [query, setQuery] = useState('');
  const [resources, setResources] = useState([]);
  const [bookmarked, setBookmarked] = useState(new Set());
  const [subject, setSubject] = useState('All');
  const [grade, setGrade] = useState('All');
  const [type, setType] = useState('All');
  const [premiumFilter, setPremiumFilter] = useState('all'); // all, free, premium
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // list | grid
  const { isPremium, isOnTrial, trialDaysLeft } = usePremiumAccess(user);

  // ============================================================
  // Load Bookmarks
  // ============================================================

  useEffect(() => {
    if (user?.email && CONFIG.ENABLE_BOOKMARKS) {
      supabase
        .from('resource_bookmarks')
        .select('resource_id')
        .eq('user_email', user.email)
        .then(({ data, error }) => {
          if (!error && data) {
            setBookmarked(new Set(data.map(b => b.resource_id)));
          }
        });
    }
  }, [user]);

  // ============================================================
  // Search
  // ============================================================

  const search = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    setError(null);

    try {
      let supabaseQuery = supabase
        .from('resources')
        .select('*')
        .eq('is_approved', true);

      if (subject !== 'All') {
        supabaseQuery = supabaseQuery.eq('subject', subject);
      }
      if (grade !== 'All') {
        supabaseQuery = supabaseQuery.eq('grade', grade);
      }
      if (type !== 'All') {
        supabaseQuery = supabaseQuery.eq('type', type);
      }
      if (premiumFilter === 'free') {
        supabaseQuery = supabaseQuery.eq('is_premium', false);
      } else if (premiumFilter === 'premium') {
        supabaseQuery = supabaseQuery.eq('is_premium', true);
      }

      if (query.trim()) {
        supabaseQuery = supabaseQuery.ilike('title', `%${query.trim()}%`);
      }

      const { data, error: searchError } = await supabaseQuery
        .order('created_at', { ascending: false })
        .limit(CONFIG.RESULTS_PER_PAGE);

      if (searchError) throw searchError;
      setResources(data || []);

      if (data?.length === 0) {
        toast.info(CONFIG.MESSAGES.NO_RESULTS);
      }
    } catch (err) {
      console.error('Error searching resources:', err);
      setError(CONFIG.MESSAGES.SEARCH_ERROR);
      toast.error(CONFIG.MESSAGES.SEARCH_ERROR);
    } finally {
      setLoading(false);
    }
  }, [query, subject, grade, type, premiumFilter]);

  // ============================================================
  // Toggle Bookmark
  // ============================================================

  const toggleBookmark = async (resource) => {
    if (!user) {
      toast.error(CONFIG.MESSAGES.SIGN_IN_REQUIRED);
      return;
    }

    try {
      if (bookmarked.has(resource.id)) {
        const { error } = await supabase
          .from('resource_bookmarks')
          .delete()
          .eq('user_email', user.email)
          .eq('resource_id', resource.id);

        if (error) throw error;
        setBookmarked(prev => {
          const n = new Set(prev);
          n.delete(resource.id);
          return n;
        });
        toast.success(CONFIG.MESSAGES.BOOKMARK_REMOVED);
      } else {
        const { error } = await supabase
          .from('resource_bookmarks')
          .insert({
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

  // ============================================================
  // Clear Filters
  // ============================================================

  const clearFilters = () => {
    setQuery('');
    setSubject('All');
    setGrade('All');
    setType('All');
    setPremiumFilter('all');
  };

  const hasFilters = query.trim() || subject !== 'All' || grade !== 'All' || type !== 'All' || premiumFilter !== 'all';

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-background">
      {isOnTrial && <TrialBanner trialDaysLeft={trialDaysLeft} />}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-playfair text-3xl font-bold mb-1 flex items-center gap-2">
            <Search className="w-7 h-7 text-primary" /> Study Resource Search
          </h1>
          <p className="text-muted-foreground">
            Search across all CAPS-aligned resources uploaded by verified tutors.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-6 space-y-3 shadow-sm">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 pr-9"
                placeholder="Search by title, subject, topic..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                aria-label="Search resources"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button onClick={search} className="bg-primary gap-1.5" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="grid grid-cols-3 gap-2 flex-1">
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
                  {CONFIG.RESOURCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {CONFIG.ENABLE_PREMIUM_FILTER && (
              <Select value={premiumFilter} onValueChange={setPremiumFilter}>
                <SelectTrigger className="h-8 text-xs w-28">
                  <SelectValue placeholder="Premium" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="free">Free Only</SelectItem>
                  <SelectItem value="premium">Premium Only</SelectItem>
                </SelectContent>
              </Select>
            )}
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </Button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={search}
                className="h-6 text-xs ml-auto"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Retry
              </Button>
            </div>
          )}
        </div>

        {/* Results Header */}
        {searched && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {resources.length} result{resources.length !== 1 ? 's' : ''} found
              </p>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => setViewMode('list')}
                className="h-7 w-7 p-0"
                aria-label="List view"
              >
                <List className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className="h-7 w-7 p-0"
                aria-label="Grid view"
              >
                <Grid3x3 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Results */}
        {searched && (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-2'}>
            {resources.map(r => {
              const Icon = typeIcons[r.type] || FileText;
              const isBookmarked = bookmarked.has(r.id);
              return (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  isBookmarked={isBookmarked}
                  onToggleBookmark={toggleBookmark}
                  isPremium={isPremium}
                  icon={Icon}
                />
              );
            })}
            {resources.length === 0 && !loading && (
              <div className="col-span-full text-center py-12 bg-card rounded-2xl border border-border">
                <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="font-semibold mb-1">No resources found</p>
                <p className="text-sm text-muted-foreground">
                  {hasFilters ? 'Try adjusting your search or filters.' : 'Try different keywords or adjust the filters.'}
                </p>
                {hasFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="mt-3"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {!searched && (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="w-14 h-14 mx-auto mb-4 opacity-30" />
            <p className="font-medium">{CONFIG.MESSAGES.AWAITING_SEARCH}</p>
            <p className="text-sm mt-1">Search across thousands of CAPS-aligned resources</p>
          </div>
        )}

        {/* Quick Stats */}
        {searched && resources.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border pt-4">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {resources.filter(r => !r.is_premium).length} free
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {resources.filter(r => r.is_premium).length} premium
            </span>
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              {resources.reduce((sum, r) => sum + (r.download_count || 0), 0)} total downloads
            </span>
            {isPremium && (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
                <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Premium unlocked
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
