import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, Star, Mail, CheckCircle, Loader2, Shield, AlertCircle, 
  User, Clock, BookOpen, MessageCircle, Calendar, Award,
  MapPin, Globe, Languages, ThumbsUp, Zap, Crown, Sparkles,
  Wifi, WifiOff, Signal
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const MAX_TUTORS_TO_SHOW = 4;
const PRESENCE_REFRESH_INTERVAL = 30000; // 30 seconds

// ============================================================
// Helper Functions
// ============================================================

const formatRating = (rating) => {
  if (!rating || rating === 0) return null;
  return Number(rating).toFixed(1);
};

// Robust language parsing
const parseLanguages = (languages) => {
  if (!languages) return [];
  if (Array.isArray(languages)) return languages;
  if (typeof languages === 'string') {
    return languages.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

// Subject parsing
const parseSubjects = (subjects) => {
  if (!subjects) return [];
  if (Array.isArray(subjects)) return subjects;
  if (typeof subjects === 'string') {
    return subjects.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

// ============================================================
// Presence Tracking (Realtime)
// ============================================================

class PresenceTracker {
  constructor() {
    this.channel = null;
    this.listeners = new Set();
  }

  subscribe(tutorIds, onUpdate) {
    if (!tutorIds || tutorIds.length === 0) return;

    this.listeners.add(onUpdate);

    if (this.channel) {
      this.channel.unsubscribe();
    }

    this.channel = supabase.channel('tutor-presence');
    
    // Track each tutor's presence
    tutorIds.forEach(id => {
      this.channel.on('presence', { event: 'sync' }, () => {
        const state = this.channel.presenceState();
        onUpdate(state);
      });
    });

    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track current user's presence
        await this.channel.track({
          online_at: new Date().toISOString(),
          user_id: id,
        });
      }
    });

    // Heartbeat to keep presence alive
    this.heartbeatInterval = setInterval(() => {
      if (this.channel) {
        this.channel.track({
          online_at: new Date().toISOString(),
          user_id: id,
        });
      }
    }, PRESENCE_REFRESH_INTERVAL);
  }

  unsubscribe() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.listeners.clear();
  }
}

// ============================================================
// TutorCard Component (Memoized)
// ============================================================

const TutorCard = memo(function TutorCard({ 
  tutor, 
  subjectName,
  isOnline = false,
  onBookingClick,
  onMessageClick
}) {
  // Parse subjects
  const subjectList = useMemo(() => parseSubjects(tutor.subjects), [tutor.subjects]);
  const languages = useMemo(() => parseLanguages(tutor.languages), [tutor.languages]);
  
  const additionalSubjects = useMemo(() => {
    return subjectList.filter(s => 
      !s.toLowerCase().includes(subjectName?.toLowerCase() || '')
    );
  }, [subjectList, subjectName]);

  const hasSACE = !!tutor.sace_number;
  const hasLanguages = languages.length > 0;
  const hasExperience = tutor.years_experience && tutor.years_experience > 0;
  const hasCompletedSessions = tutor.completed_sessions && tutor.completed_sessions > 0;
  
  // Calculate trust score for display
  const trustScore = useMemo(() => {
    let score = 0;
    if (tutor.is_verified) score += 20;
    if (hasSACE) score += 20;
    if (tutor.rating && tutor.rating >= 4.5) score += 15;
    if (hasCompletedSessions && tutor.completed_sessions > 100) score += 15;
    if (hasExperience && tutor.years_experience >= 3) score += 10;
    if (tutor.is_top_rated) score += 10;
    if (tutor.is_featured) score += 10;
    return Math.min(100, score);
  }, [tutor]);

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group border border-transparent hover:border-border">
      
      {/* Avatar with Online Status */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-12 h-12">
          <AvatarImage src={tutor.avatar_url || undefined} alt={tutor.full_name || 'Tutor'} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
            {tutor.full_name?.[0]?.toUpperCase() || 'T'}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full" />
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold truncate">
            {tutor.full_name || 'Tutor'}
          </p>
          
          {/* Verification Badges */}
          {tutor.is_verified && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Verified Tutor</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {hasSACE && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Shield className="w-3 h-3 text-blue-500 flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">SACE Registered</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {tutor.is_top_rated && (
            <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-200 gap-0.5">
              <Crown className="w-2.5 h-2.5" /> Top Rated
            </Badge>
          )}
          
          {tutor.is_featured && (
            <Badge className="text-[9px] bg-purple-100 text-purple-700 border-purple-200 gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> Featured
            </Badge>
          )}
        </div>
        
        {/* Stats Row */}
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {/* Rating */}
          {tutor.rating && tutor.rating > 0 && (
            <span className="text-xs flex items-center gap-0.5 text-amber-600 font-medium">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> 
              {formatRating(tutor.rating)}
              {tutor.review_count > 0 && (
                <span className="text-[10px] text-muted-foreground font-normal">
                  ({tutor.review_count})
                </span>
              )}
            </span>
          )}
          
          {/* Trust Score */}
          {trustScore > 50 && (
            <span className="text-[10px] text-green-600 flex items-center gap-0.5">
              <Shield className="w-2.5 h-2.5" /> {trustScore}% Trust Score
            </span>
          )}
          
          {/* Hourly Rate */}
          {tutor.hourly_rate && tutor.hourly_rate > 0 && (
            <span className="text-xs text-muted-foreground font-medium">
              R{tutor.hourly_rate}/hr
            </span>
          )}
          
          {/* Experience */}
          {hasExperience && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Award className="w-3 h-3" /> {tutor.years_experience}yrs
            </span>
          )}
          
          {/* Completed Sessions */}
          {hasCompletedSessions && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <ThumbsUp className="w-3 h-3" /> {tutor.completed_sessions} sessions
            </span>
          )}
          
          {/* Online Status */}
          <span className="flex items-center gap-1">
            {isOnline ? (
              <>
                <Signal className="w-2.5 h-2.5 text-green-500" />
                <span className="text-[10px] text-green-600">Available Now</span>
              </>
            ) : (
              <>
                <WifiOff className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Offline</span>
              </>
            )}
          </span>
        </div>
        
        {/* Additional Info Row */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Languages */}
          {hasLanguages && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Languages className="w-3 h-3" /> {languages.slice(0, 2).join(', ')}
              {languages.length > 2 && ` +${languages.length - 2}`}
            </span>
          )}
          
          {/* Location */}
          {tutor.location && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <MapPin className="w-3 h-3" /> {tutor.location}
            </span>
          )}
          
          {/* Additional Subjects */}
          {additionalSubjects.length > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <BookOpen className="w-3 h-3" /> 
              +{additionalSubjects.length} more subject{additionalSubjects.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        {/* Bio (truncated) */}
        {tutor.bio && (
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-snug">
            {tutor.bio}
          </p>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        {/* View Profile */}
        <Link to={`/tutor/${tutor.id}`}>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs gap-1 w-full"
          >
            <User className="w-3 h-3" /> Profile
          </Button>
        </Link>
        
        {/* Book Session */}
        {tutor.has_available_slots !== false && (
          <Link to={`/bookings/new?tutor=${tutor.id}&subject=${encodeURIComponent(subjectName || '')}`}>
            <Button 
              size="sm" 
              className="h-7 text-xs gap-1 w-full bg-primary hover:bg-primary/90"
              onClick={() => onBookingClick?.(tutor.id)}
            >
              <Calendar className="w-3 h-3" /> 
              {tutor.available_today ? 'Book Now' : 'Book'}
            </Button>
          </Link>
        )}
        
        {/* Message */}
        {tutor.accepts_messages !== false && (
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 text-xs gap-1 w-full text-muted-foreground hover:text-primary"
            onClick={() => onMessageClick?.(tutor.id)}
          >
            <MessageCircle className="w-3 h-3" /> Message
          </Button>
        )}
      </div>
    </div>
  );
});

// ============================================================
// Main Component
// ============================================================

export default function SubjectTutors({ 
  subjectName, 
  limit = MAX_TUTORS_TO_SHOW,
  showViewAll = true,
  className = '',
  onTutorSelect,
  onBookingClick,
  onMessageClick
}) {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [onlineTutors, setOnlineTutors] = useState(new Set());
  const presenceTracker = useRef(null);

  // ============================================================
  // Fetch Tutors for Subject - SERVER-SIDE FILTERING
  // ============================================================

  const fetchTutors = useCallback(async () => {
    if (!subjectName) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 🚀 SCALABLE: Use PostgreSQL array contains for server-side filtering
      const { data, error: queryError, count } = await supabase
        .from('tutor_profiles')
        .select(`
          id,
          full_name,
          avatar_url,
          rating,
          review_count,
          hourly_rate,
          subjects,
          is_verified,
          is_active,
          sace_number,
          years_experience,
          completed_sessions,
          languages,
          location,
          bio,
          last_online,
          accepts_messages,
          is_top_rated,
          is_featured,
          has_available_slots,
          available_today
        `, { count: 'exact' })
        .eq('is_active', true)
        .eq('is_verified', true)
        .contains('subjects', [subjectName])
        .order('is_featured', { ascending: false })
        .order('is_top_rated', { ascending: false })
        .order('rating', { ascending: false, nullsLast: true })
        .limit(limit + 1);

      if (queryError) throw queryError;

      const tutorsData = data || [];
      setTutors(tutorsData.slice(0, limit));
      setTotalCount(count || tutorsData.length);

      // Setup presence tracking
      const tutorIds = tutorsData.slice(0, limit).map(t => t.id);
      if (tutorIds.length > 0) {
        setupPresenceTracking(tutorIds);
      }

    } catch (err) {
      console.error('Error fetching tutors:', err);
      setError('Failed to load tutors');
      toast.error('Failed to load tutors');
      setTutors([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [subjectName, limit]);

  // ============================================================
  // Presence Tracking
  // ============================================================

  const setupPresenceTracking = useCallback((tutorIds) => {
    if (presenceTracker.current) {
      presenceTracker.current.unsubscribe();
    }

    presenceTracker.current = new PresenceTracker();
    presenceTracker.current.subscribe(tutorIds, (presenceState) => {
      const online = new Set();
      Object.keys(presenceState).forEach(key => {
        const users = presenceState[key];
        if (users && users.length > 0) {
          users.forEach(user => {
            if (user.user_id) online.add(user.user_id);
          });
        }
      });
      setOnlineTutors(online);
    });
  }, []);

  // ============================================================
  // Cleanup Presence Tracking
  // ============================================================

  useEffect(() => {
    return () => {
      if (presenceTracker.current) {
        presenceTracker.current.unsubscribe();
      }
    };
  }, []);

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <Card className={`border-border mt-6 ${className}`}>
        <CardContent className="py-6 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Finding available tutors...</span>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Error State
  // ============================================================

  if (error) {
    return (
      <Card className={`border-border mt-6 border-red-200 bg-red-50/30 dark:bg-red-950/10 dark:border-red-800 ${className}`}>
        <CardContent className="py-4 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>Unable to load tutors. Please refresh.</span>
          <button 
            onClick={fetchTutors}
            className="text-primary hover:underline font-medium ml-auto"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // No Tutors Found - Better Empty State
  // ============================================================

  if (tutors.length === 0) {
    return (
      <Card className={`border-border mt-6 border-dashed ${className}`}>
        <CardContent className="py-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No tutors available yet</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              We're growing our tutor network. Check back soon or explore other subjects.
            </p>
            <div className="flex gap-2 mt-2">
              <Link to="/tutors">
                <Button size="sm" variant="outline" className="text-xs">
                  Browse All Tutors
                </Button>
              </Link>
              <Link to="/become-tutor">
                <Button size="sm" variant="default" className="text-xs bg-primary">
                  Become a Tutor
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  const hasMoreTutors = totalCount > limit;

  return (
    <Card className={`border-border mt-6 shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> 
            Available Tutors
            <Badge variant="secondary" className="text-xs font-normal">
              {totalCount}
            </Badge>
            {onlineTutors.size > 0 && (
              <Badge className="text-[9px] bg-green-100 text-green-700 border-green-200 gap-0.5">
                <Signal className="w-2.5 h-2.5" /> {onlineTutors.size} online now
              </Badge>
            )}
          </CardTitle>
          {showViewAll && totalCount > 0 && (
            <Link 
              to={`/tutors?subject=${encodeURIComponent(subjectName)}`} 
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
            >
              View all ({totalCount}) →
            </Link>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Verified {appName} tutors available for {subjectName}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {tutors.map((tutor) => (
          <TutorCard 
            key={tutor.id} 
            tutor={tutor} 
            subjectName={subjectName}
            isOnline={onlineTutors.has(tutor.id)}
            onBookingClick={onBookingClick}
            onMessageClick={onMessageClick}
          />
        ))}
        
        {/* "See More" button if there are additional tutors */}
        {hasMoreTutors && (
          <Link to={`/tutors?subject=${encodeURIComponent(subjectName)}`}>
            <Button 
              variant="outline" 
              className="w-full text-xs h-8 gap-1 mt-2"
            >
              <Users className="w-3.5 h-3.5" /> 
              See all {totalCount} tutors
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
