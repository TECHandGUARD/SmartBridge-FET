// src/pages/Tutors.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, Star, CheckCircle, Mail, CalendarDays, Radio,
  MessageCircle, User, ShieldCheck, Video, Loader2,
  Filter, X, Grid3x3, List, TrendingUp, Clock,
  Award, Sparkles, MapPin, Globe, Zap, Heart
} from 'lucide-react';
import { toast } from 'sonner';
import BookingModal from '@/components/tutor/BookingModal';
import LiveTutorChat from '@/components/tutor/LiveTutorChat';
import TutorProfileModal from '@/components/tutor/TutorProfileModal';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  // Display limits
  TUTORS_PER_PAGE: Number(import.meta.env.VITE_TUTORS_DISPLAY_LIMIT) || 30,

  // Feature flags
  ENABLE_LIVE_INDICATOR: import.meta.env.VITE_ENABLE_LIVE_INDICATOR !== 'false',
  ENABLE_VIDEO_INDICATOR: import.meta.env.VITE_ENABLE_VIDEO_INDICATOR !== 'false',
  ENABLE_RATING_DISPLAY: import.meta.env.VITE_ENABLE_RATING_DISPLAY !== 'false',

  // Messages
  MESSAGES: {
    TITLE: import.meta.env.VITE_TUTORS_TITLE || 'Find a Tutor',
    SUBTITLE: import.meta.env.VITE_TUTORS_SUBTITLE || 'Connect with qualified tutors. See their photo, watch their intro video, and choose who\'s right for you.',
    NO_TUTORS: import.meta.env.VITE_TUTORS_NO_TUTORS_MSG || 'No tutors found. Try adjusting your search.',
    NO_TUTORS_REGISTERED: import.meta.env.VITE_TUTORS_NO_REGISTERED_MSG || 'Tutors will appear here once they register.',
    SEARCH_PLACEHOLDER: import.meta.env.VITE_TUTORS_SEARCH_PLACEHOLDER || 'Search by name or subject...',
    BADGE_LABEL: import.meta.env.VITE_TUTORS_BADGE_LABEL || 'Find Your Perfect Match',
    SACE_VERIFIED: import.meta.env.VITE_TUTORS_SACE_VERIFIED || 'SACE Verified',
    ADMIN_VERIFIED: import.meta.env.VITE_TUTORS_ADMIN_VERIFIED || 'Admin Verified',
    LIVE_IN: import.meta.env.VITE_TUTORS_LIVE_IN || 'Live in',
    HAS_VIDEO: import.meta.env.VITE_TUTORS_HAS_VIDEO || 'Has intro video',
    NO_REVIEWS: import.meta.env.VITE_TUTORS_NO_REVIEWS || 'No reviews yet',
    PROFILE: import.meta.env.VITE_TUTORS_PROFILE || 'Profile',
    CHAT: import.meta.env.VITE_TUTORS_CHAT || 'Chat',
    BOOK: import.meta.env.VITE_TUTORS_BOOK || 'Book',
  },
};

// ============================================================
// Helper Functions
// ============================================================

async function fetchTutorWithRatings(tutor) {
  try {
    const { data: reviews, error } = await supabase
      .from('tutor_reviews')
      .select('rating')
      .eq('tutor_email', tutor.user_email);

    if (error) throw error;

    const avgRating = reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;
    return { ...tutor, rating: avgRating, total_reviews: reviews?.length || 0 };
  } catch (error) {
    console.error('Failed to fetch reviews for', tutor.user_email, error);
    return { ...tutor, rating: null, total_reviews: 0 };
  }
}

// ============================================================
// Sub-Components
// ============================================================

function TutorCard({
  tutor,
  isInSession,
  sessionPlatform,
  onProfile,
  onChat,
  onBook,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
          {tutor.avatar_url ? (
            <img src={tutor.avatar_url} alt={tutor.full_name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-playfair font-bold text-foreground group-hover:text-primary transition-colors">
              {tutor.full_name}
            </p>
            {tutor.is_verified && (
              tutor.sace_number ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800 text-xs mt-0.5 gap-1">
                  <ShieldCheck className="w-3 h-3" /> {CONFIG.MESSAGES.SACE_VERIFIED}
                </Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 text-xs mt-0.5 gap-1">
                  <CheckCircle className="w-3 h-3" /> {CONFIG.MESSAGES.ADMIN_VERIFIED}
                </Badge>
              )
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            {CONFIG.ENABLE_LIVE_INDICATOR && isInSession && (
              <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800 text-xs gap-1 animate-pulse">
                <Radio className="w-3 h-3" /> {CONFIG.MESSAGES.LIVE_IN} {sessionPlatform || 'session'}
              </Badge>
            )}
            {CONFIG.ENABLE_RATING_DISPLAY && tutor.rating && tutor.rating > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {tutor.rating.toFixed(1)} ({tutor.total_reviews})
              </Badge>
            )}
            {tutor.hourly_rate && (
              <Badge variant="outline" className="text-xs font-semibold">
                R{tutor.hourly_rate}/hr
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {tutor.bio && (
        <div className="mb-2">
          <p className={`text-sm text-muted-foreground ${expanded ? '' : 'line-clamp-2'}`}>
            {tutor.bio}
          </p>
          {tutor.bio.length > 100 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline font-medium mt-0.5"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Qualifications */}
      {tutor.qualifications && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
          🎓 {typeof tutor.qualifications === 'string' ? tutor.qualifications : tutor.qualifications?.join(', ')}
        </p>
      )}

      {/* Subjects */}
      {tutor.subjects?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tutor.subjects.slice(0, 4).map((s) => (
            <Badge key={s} variant="secondary" className="text-xs font-medium">{s}</Badge>
          ))}
          {tutor.subjects.length > 4 && (
            <Badge variant="secondary" className="text-xs">+{tutor.subjects.length - 4}</Badge>
          )}
        </div>
      )}

      {/* Video indicator */}
      {CONFIG.ENABLE_VIDEO_INDICATOR && tutor.video_url && (
        <div className="flex items-center gap-1 mb-3">
          <Badge variant="outline" className="text-[10px] gap-1 text-primary border-primary/30">
            <Video className="w-3 h-3" /> {CONFIG.MESSAGES.HAS_VIDEO}
          </Badge>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {tutor.total_reviews > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {tutor.rating.toFixed(1)} ({tutor.total_reviews})
            </span>
          )}
          {!tutor.rating && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Star className="w-3.5 h-3.5" /> {CONFIG.MESSAGES.NO_REVIEWS}
            </span>
          )}
          {tutor.experience_years && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {tutor.experience_years}yrs
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs h-8 hover:bg-primary/5"
            onClick={() => onProfile(tutor)}
          >
            <User className="w-3 h-3" /> {CONFIG.MESSAGES.PROFILE}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs h-8 hover:bg-primary/5"
            onClick={() => onChat(tutor)}
          >
            <MessageCircle className="w-3 h-3" /> {CONFIG.MESSAGES.CHAT}
          </Button>
          <Button
            size="sm"
            className="gap-1 text-xs h-8 bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-300"
            onClick={() => onBook(tutor)}
          >
            <CalendarDays className="w-3 h-3" /> {CONFIG.MESSAGES.BOOK}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ tutorsExist, searchQuery, onClear }) {
  return (
    <div className="text-center py-20 bg-card rounded-2xl border border-border">
      <div className="text-6xl mb-4">👨‍🏫</div>
      <p className="text-xl font-semibold mb-2">{CONFIG.MESSAGES.NO_TUTORS}</p>
      <p className="text-muted-foreground">
        {!tutorsExist
          ? CONFIG.MESSAGES.NO_TUTORS_REGISTERED
          : searchQuery
            ? 'Try adjusting your search terms.'
            : 'Try adjusting your filters.'}
      </p>
      {searchQuery && (
        <Button variant="outline" size="sm" onClick={onClear} className="mt-4 gap-1">
          <X className="w-3.5 h-3.5" /> Clear Search
        </Button>
      )}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function Tutors() {
  // ✅ FIXED: Use useAuth() instead of useOutletContext()
  const { user } = useAuth();
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [bookingTutor, setBookingTutor] = useState(null);
  const [chatTutor, setChatTutor] = useState(null);
  const [profileTutor, setProfileTutor] = useState(null);
  const [tutorUsers, setTutorUsers] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // grid | list
  const [filterOnline, setFilterOnline] = useState(false);

  // ============================================================
  // Load Live Sessions
  // ============================================================

  const loadLiveSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('email, session_platform')
        .eq('in_session', true);

      if (error) throw error;
      setTutorUsers(data || []);
    } catch (error) {
      console.error('Failed to load live sessions:', error);
    }
  }, []);

  // ============================================================
  // Load Tutors
  // ============================================================

  const loadTutors = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: tutorsList, error: tutorsError } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('is_verified', true)
        .order('rating', { ascending: false })
        .limit(CONFIG.TUTORS_PER_PAGE);

      if (tutorsError) throw tutorsError;

      const tutorsWithRatings = await Promise.all(
        (tutorsList || []).map(tutor => fetchTutorWithRatings(tutor))
      );

      const sortedTutors = tutorsWithRatings.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      setTutors(sortedTutors);
    } catch (error) {
      console.error('Failed to load tutors:', error);
      setError('Failed to load tutors. Please try again.');
      toast.error('Failed to load tutors');
      setTutors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTutors();
    loadLiveSessions();

    // Real-time subscription for tutor changes
    const channel = supabase
      .channel('tutors-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tutor_profiles' },
        () => loadTutors()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTutors, loadLiveSessions]);

  // ============================================================
  // Search
  // ============================================================

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filtered = useMemo(() => {
    let result = tutors.filter((t) =>
      t.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      t.subjects?.some((s) => s.toLowerCase().includes(debouncedSearch.toLowerCase()))
    );

    if (filterOnline) {
      const inSessionEmails = new Set(tutorUsers.map(u => u.email));
      result = result.filter(t => inSessionEmails.has(t.user_email));
    }

    return result;
  }, [tutors, debouncedSearch, filterOnline, tutorUsers]);

  // ============================================================
  // Handlers
  // ============================================================

  const clearSearch = () => {
    setSearch('');
    setFilterOnline(false);
  };

  const inSessionEmails = new Set(tutorUsers.map(u => u.email));
  const sessionPlatforms = Object.fromEntries(tutorUsers.map(u => [u.email, u.session_platform]));

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground animate-pulse">Loading tutors...</p>
      </div>
    );
  }

  // ============================================================
  // Error State
  // ============================================================

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <p className="text-destructive font-medium mb-4">{error}</p>
          <Button onClick={loadTutors} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  const hasFilters = search.trim() || filterOnline;

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-10">
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20 gap-1.5">
            <Sparkles className="w-3 h-3" /> {CONFIG.MESSAGES.BADGE_LABEL}
          </Badge>
          <h1 className="font-playfair text-4xl font-bold text-foreground mb-3">
            {CONFIG.MESSAGES.TITLE}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {CONFIG.MESSAGES.SUBTITLE}
          </p>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={CONFIG.MESSAGES.SEARCH_PLACEHOLDER}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={filterOnline ? 'default' : 'outline'}
              onClick={() => setFilterOnline(!filterOnline)}
              className="gap-1.5 text-xs"
            >
              <Radio className="w-3.5 h-3.5" />
              Live Now {filterOnline ? '✓' : ''}
            </Button>
            <div className="flex items-center gap-1 border-l border-border pl-2 ml-1">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0"
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results Stats */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {filtered.length} tutor{filtered.length !== 1 ? 's' : ''} found
          </p>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-7 text-xs gap-1"
            >
              <X className="w-3 h-3" /> Clear Filters
            </Button>
          )}
        </div>

        {/* Tutor Grid */}
        {filtered.length === 0 ? (
          <EmptyState
            tutorsExist={tutors.length > 0}
            searchQuery={search}
            onClear={clearSearch}
          />
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-5'
              : 'space-y-3'
          }>
            {filtered.map((tutor) => (
              <TutorCard
                key={tutor.id}
                tutor={tutor}
                isInSession={inSessionEmails.has(tutor.user_email)}
                sessionPlatform={sessionPlatforms[tutor.user_email]}
                onProfile={setProfileTutor}
                onChat={setChatTutor}
                onBook={setBookingTutor}
              />
            ))}
          </div>
        )}

        {/* Footer Stats */}
        {filtered.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t border-border pt-4">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {tutors.length} total tutors
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {tutors.filter(t => t.rating && t.rating > 4).length} top-rated
            </span>
            <span className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-green-500" />
              {tutorUsers.length} live now
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      <TutorProfileModal
        tutor={profileTutor}
        user={user}
        open={!!profileTutor}
        onClose={() => setProfileTutor(null)}
        onBook={(t) => setBookingTutor(t)}
        onChat={(t) => setChatTutor(t)}
      />
      {bookingTutor && (
        <BookingModal
          tutor={bookingTutor}
          user={user}
          open={!!bookingTutor}
          onClose={() => setBookingTutor(null)}
        />
      )}
      {chatTutor && (
        <LiveTutorChat
          user={user}
          tutorEmail={chatTutor.user_email}
          tutorName={chatTutor.full_name}
          onClose={() => setChatTutor(null)}
        />
      )}
    </div>
  );
}
