// src/pages/StudentDashboard.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, Calendar, Clock, Star, FileText, ChevronRight, 
  GraduationCap, TrendingUp, Activity, Loader2, RefreshCw, AlertCircle,
  Plus, ChevronDown, ChevronUp, Search, Filter, Lock
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',
  
  // Display limits
  RESOURCES_INITIAL_LIMIT: Number(import.meta.env.VITE_STUDENT_RESOURCES_INITIAL_LIMIT) || 6,
  RESOURCES_BATCH_SIZE: Number(import.meta.env.VITE_STUDENT_RESOURCES_BATCH_SIZE) || 20,
  TUTORS_LIMIT: Number(import.meta.env.VITE_STUDENT_TUTORS_LIMIT) || 5,
  BOOKINGS_LIMIT: Number(import.meta.env.VITE_STUDENT_BOOKINGS_LIMIT) || 20,
  MAX_RESOURCES: Number(import.meta.env.VITE_STUDENT_MAX_RESOURCES) || 1000,
  
  // Real-time settings
  DEBOUNCE_DELAY: Number(import.meta.env.VITE_STUDENT_DEBOUNCE_DELAY) || 2000,
  POLLING_INTERVAL: Number(import.meta.env.VITE_STUDENT_POLLING_INTERVAL) || 300000,
  
  // Feature flags
  FEATURES: {
    ENABLE_REAL_TIME: import.meta.env.VITE_STUDENT_ENABLE_REAL_TIME !== 'false',
    ENABLE_POLLING: import.meta.env.VITE_STUDENT_ENABLE_POLLING !== 'false',
    ENABLE_LOGGING: import.meta.env.VITE_STUDENT_ENABLE_LOGGING !== 'false',
    ENABLE_RESOURCE_SEARCH: import.meta.env.VITE_STUDENT_ENABLE_RESOURCE_SEARCH !== 'false',
  },
  
  // Messages
  MESSAGES: {
    WELCOME: import.meta.env.VITE_STUDENT_WELCOME_MSG || 'Welcome back, Scholar!',
    WELCOME_DESC: import.meta.env.VITE_STUDENT_WELCOME_DESC || 'Track your classes, access study material, and manage your progress.',
    NO_BOOKINGS: import.meta.env.VITE_STUDENT_NO_BOOKINGS_MSG || 'No upcoming booking requests found.',
    NO_RESOURCES: import.meta.env.VITE_STUDENT_NO_RESOURCES_MSG || 'No learning resources available yet.',
    NO_TUTORS: import.meta.env.VITE_STUDENT_NO_TUTORS_MSG || 'No certified instructors available.',
    REFRESH: import.meta.env.VITE_STUDENT_REFRESH_BTN || 'Refresh Dashboard',
    REFRESHING: import.meta.env.VITE_STUDENT_REFRESHING_BTN || 'Refreshing...',
    ERROR_LOADING: import.meta.env.VITE_STUDENT_ERROR_LOADING || 'Failed to load dashboard data',
    LOAD_MORE: import.meta.env.VITE_STUDENT_LOAD_MORE || 'Load More Resources',
    LOADING_MORE: import.meta.env.VITE_STUDENT_LOADING_MORE || 'Loading more...',
    NO_MORE_RESOURCES: import.meta.env.VITE_STUDENT_NO_MORE || 'No more resources to load.',
    SHOWING_RESOURCES: import.meta.env.VITE_STUDENT_SHOWING || 'Showing {current} of {total} resources',
    SEARCH_PLACEHOLDER: import.meta.env.VITE_STUDENT_SEARCH_PLACEHOLDER || 'Search resources...',
    FILTER_BY_SUBJECT: import.meta.env.VITE_STUDENT_FILTER_SUBJECT || 'Filter by subject',
    ALL_SUBJECTS: import.meta.env.VITE_STUDENT_ALL_SUBJECTS || 'All Subjects',
    PREMIUM_LOCKED: import.meta.env.VITE_STUDENT_PREMIUM_LOCKED || 'Premium content locked',
    UPGRADE_TO_PREMIUM: import.meta.env.VITE_STUDENT_UPGRADE || 'Upgrade to Premium',
  },
  
  CURRENCY: import.meta.env.VITE_PREMIUM_CURRENCY || 'R',
};

// ============================================================
// 📚 Resources Section with Load More
// ============================================================

function ResourcesSection({ 
  resources, 
  totalCount, 
  loading, 
  loadingMore, 
  hasMore, 
  onLoadMore,
  onSearch,
  onFilter,
  subjects,
  isPremium 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (value) => {
    setSearchTerm(value);
    onSearch?.(value);
  };

  const handleFilter = (subject) => {
    setSelectedSubject(subject);
    onFilter?.(subject);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
        <CardTitle className="font-playfair text-xl flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Study Resources
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {resources.length} of {totalCount > 0 ? totalCount.toLocaleString() : '...'}
          </Badge>
          {isPremium && (
            <Badge className="bg-amber-100 text-amber-700 text-xs gap-1">
              <Star className="w-3 h-3 fill-current" /> Premium Access
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Search & Filter Bar */}
        {CONFIG.FEATURES.ENABLE_RESOURCE_SEARCH && (
          <div className="mb-4 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={CONFIG.MESSAGES.SEARCH_PLACEHOLDER}
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-1.5 h-9"
              >
                <Filter className="w-3.5 h-3.5" />
                Filters
                {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>
            </div>
            
            {showFilters && (
              <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-muted/30 border border-border">
                <Button
                  size="sm"
                  variant={selectedSubject === 'all' ? 'default' : 'outline'}
                  onClick={() => handleFilter('all')}
                  className="text-xs h-7"
                >
                  {CONFIG.MESSAGES.ALL_SUBJECTS}
                </Button>
                {subjects?.map((subject) => (
                  <Button
                    key={subject}
                    size="sm"
                    variant={selectedSubject === subject ? 'default' : 'outline'}
                    onClick={() => handleFilter(subject)}
                    className="text-xs h-7"
                  >
                    {subject}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resources Grid */}
        {resources.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-xl bg-muted/20">
            <FileText className="w-8 h-8 mx-auto text-muted-foreground stroke-1 mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'No resources match your search.' : CONFIG.MESSAGES.NO_RESOURCES}
            </p>
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSearch('')}
                className="mt-2 text-xs"
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {resources.map((res) => (
                <div key={res.id} className="p-4 rounded-xl border border-border flex flex-col justify-between hover:border-primary/40 transition-all bg-card group">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="outline" className="text-[10px] tracking-wide uppercase px-1.5">
                        {res.grade || 'FET'}
                      </Badge>
                      <span className="text-[11px] font-medium text-primary font-sans">
                        {res.subject}
                      </span>
                      {res.is_premium && !isPremium && (
                        <Badge className="bg-amber-100 text-amber-700 text-[9px] gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-current" /> Premium
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium text-sm text-card-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {res.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {res.description || 'No description available.'}
                    </p>
                    {res.is_premium && !isPremium && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" />
                        {CONFIG.MESSAGES.PREMIUM_LOCKED}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground capitalize">
                      {res.type || 'Document'}
                    </span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 text-xs px-2 gap-1 group-hover:translate-x-0.5 transition-transform"
                      disabled={res.is_premium && !isPremium}
                    >
                      {res.is_premium && !isPremium ? 'Locked' : 'View'}
                      {!res.is_premium && <ChevronRight className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex flex-col items-center gap-2 pt-4 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="gap-2 min-w-[200px]"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {CONFIG.MESSAGES.LOADING_MORE}
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      {CONFIG.MESSAGES.LOAD_MORE}
                    </>
                  )}
                </Button>
                <p className="text-[10px] text-muted-foreground">
                  {CONFIG.MESSAGES.SHOWING_RESOURCES
                    .replace('{current}', resources.length)
                    .replace('{total}', totalCount > 0 ? totalCount.toLocaleString() : '...')}
                </p>
              </div>
            )}

            {/* No More Resources */}
            {!hasMore && resources.length > 0 && totalCount > 0 && (
              <div className="text-center pt-4 border-t border-border/40">
                <p className="text-xs text-muted-foreground">
                  ✅ {CONFIG.MESSAGES.NO_MORE_RESOURCES}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {totalCount.toLocaleString()} resources available
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function StudentDashboard() {
  // ✅ FIXED: Use useAuth() instead of useOutletContext()
  const { user } = useAuth();

  // ---------- State ----------
  const [resources, setResources] = useState([]);
  const [totalResourceCount, setTotalResourceCount] = useState(0);
  const [hasMoreResources, setHasMoreResources] = useState(true);
  const [resourceOffset, setResourceOffset] = useState(0);
  
  const [bookings, setBookings] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  // ---------- Structural Protection Guard Rails ----------
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // ---------- Load Resource Count ----------
  const loadResourceCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', true);
      
      if (error) throw error;
      if (isMountedRef.current) {
        setTotalResourceCount(count || 0);
      }
    } catch (err) {
      console.error('Error loading resource count:', err);
    }
  }, []);

  // ---------- Load Resources (Paginated) ----------
  const loadResources = useCallback(async (offset = 0, isLoadMore = false) => {
    if (!user?.email) return;
    
    const { RESOURCES_INITIAL_LIMIT, RESOURCES_BATCH_SIZE, MAX_RESOURCES } = CONFIG;
    const limit = isLoadMore ? RESOURCES_BATCH_SIZE : RESOURCES_INITIAL_LIMIT;
    
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      if (isMountedRef.current) {
        if (isLoadMore) {
          setResources(prev => [...prev, ...(data || [])]);
        } else {
          setResources(data || []);
        }
        setResourceOffset(offset + (data?.length || 0));
        setHasMoreResources((data?.length || 0) >= limit && (offset + (data?.length || 0)) < MAX_RESOURCES);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error loading resources:', err);
        toast.error(CONFIG.MESSAGES.ERROR_LOADING);
      }
    }
  }, [user?.email]);

  // ---------- Load More Resources ----------
  const loadMoreResources = useCallback(async () => {
    if (loadingMore || !hasMoreResources) return;
    
    setLoadingMore(true);
    await loadResources(resourceOffset, true);
    setLoadingMore(false);
  }, [resourceOffset, hasMoreResources, loadingMore, loadResources]);

  // ---------- Load All Dashboard Data ----------
  const loadStudentData = useCallback(async (isManualRefresh = false) => {
    if (!user?.email) return;

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isManualRefresh) {
      setRefreshing(true);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const { TUTORS_LIMIT, BOOKINGS_LIMIT } = CONFIG;

    try {
      // Load all data concurrently
      const [resourcesRes, bookingsRes, tutorsRes, premiumRes] = await Promise.allSettled([
        loadResources(0, false),
        supabase
          .from('tutor_bookings')
          .select('*')
          .eq('student_email', user.email)
          .order('date', { ascending: true })
          .limit(BOOKINGS_LIMIT),
        supabase
          .from('tutor_profiles')
          .select('*')
          .eq('is_verified', true)
          .limit(TUTORS_LIMIT),
        loadResourceCount(),
        // Check if user is premium
        supabase
          .from('subscriptions')
          .select('plan, status')
          .eq('user_email', user.email)
          .eq('status', 'active')
          .maybeSingle()
      ]);

      // Parse bookings
      if (bookingsRes.status === 'fulfilled' && !bookingsRes.value.error) {
        setBookings(bookingsRes.value.data || []);
      }

      // Parse tutors
      if (tutorsRes.status === 'fulfilled' && !tutorsRes.value.error) {
        setTutors(tutorsRes.value.data || []);
        // Extract unique subjects from tutors
        const allSubjects = new Set();
        (tutorsRes.value.data || []).forEach(t => {
          (t.subjects || []).forEach(s => allSubjects.add(s));
        });
        setSubjects(Array.from(allSubjects).slice(0, 10));
      }

      // Check premium status
      if (premiumRes.status === 'fulfilled' && !premiumRes.value.error) {
        setIsPremium(!!premiumRes.value.data);
      }

      // Safe activity logging
      if (CONFIG.FEATURES.ENABLE_LOGGING && !isManualRefresh) {
        try {
          await supabase
            .from('activity_log')
            .insert({
              event_type: 'student_dashboard_view',
              user_email: user.email,
              description: `Student dashboard viewed by ${user.email}`
            });
        } catch (logErr) {
          console.warn('Activity log failed:', logErr.message);
        }
      }

    } catch (err) {
      if (err.name !== 'AbortError' && isMountedRef.current) {
        console.error('Unhandled Student Dashboard Fetch Error:', err);
        toast.error(CONFIG.MESSAGES.ERROR_LOADING);
      }
    } finally {
      if (isMountedRef.current) {
        isFetchingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user?.email, loadResources, loadResourceCount]);

  // ---------- Lifecycle / Subscription Layer ----------
  useEffect(() => {
    isMountedRef.current = true;

    if (!user?.email) {
      setLoading(false);
      return;
    }

    loadStudentData(false);

    const handleRealtimeChange = () => {
      if (!CONFIG.FEATURES.ENABLE_REAL_TIME) return;
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      debounceTimerRef.current = setTimeout(() => {
        if (isMountedRef.current && !isFetchingRef.current) {
          loadStudentData(false);
        }
        debounceTimerRef.current = null;
      }, CONFIG.DEBOUNCE_DELAY);
    };

    const channels = [
      supabase
        .channel(`student-bookings-${user.email}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'tutor_bookings', filter: `student_email=eq.${user.email}` }, 
          handleRealtimeChange
        )
        .subscribe(),
      supabase
        .channel('student-resource-sync')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'resources' }, handleRealtimeChange)
        .subscribe()
    ];

    let pollingFallback = null;
    if (CONFIG.FEATURES.ENABLE_POLLING) {
      pollingFallback = setInterval(() => {
        if (isMountedRef.current && !isFetchingRef.current) {
          loadStudentData(false);
        }
      }, CONFIG.POLLING_INTERVAL);
    }

    return () => {
      isMountedRef.current = false;
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      if (pollingFallback) {
        clearInterval(pollingFallback);
      }
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      channels.forEach(channel => {
        try {
          supabase.removeChannel(channel);
        } catch (e) {}
      });
    };
  }, [user?.email, loadStudentData]);

  // ---------- Loading State ----------
  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground mt-3 animate-pulse">Loading your dashboard...</p>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className="space-y-8 py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Top Banner section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/40 p-6 rounded-2xl border border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-playfair tracking-tight">
            {CONFIG.MESSAGES.WELCOME}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {CONFIG.MESSAGES.WELCOME_DESC}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isPremium && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1.5 px-3 py-1.5">
              <Star className="w-4 h-4 fill-current" /> Premium Member
            </Badge>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => loadStudentData(true)} 
            disabled={refreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? CONFIG.MESSAGES.REFRESHING : CONFIG.MESSAGES.REFRESH}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Columns */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section: Resources with Load More */}
          <ResourcesSection
            resources={resources}
            totalCount={totalResourceCount}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMoreResources}
            onLoadMore={loadMoreResources}
            subjects={subjects}
            isPremium={isPremium}
          />

          {/* Section: Bookings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="font-playfair text-xl flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" /> Upcoming Sessions
              </CardTitle>
              <Badge variant="secondary">{bookings.length} Scheduled</Badge>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-xl bg-muted/20">
                  <Clock className="w-8 h-8 mx-auto text-muted-foreground stroke-1 mb-2" />
                  <p className="text-sm text-muted-foreground">{CONFIG.MESSAGES.NO_BOOKINGS}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors">
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">{booking.subject}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span>{booking.date}</span> • <span>{booking.time}</span>
                        </p>
                      </div>
                      <Badge className={
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                        booking.status === 'pending' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                        'bg-muted text-muted-foreground'
                      }>
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Content Column */}
        <div className="space-y-8">
          {/* Top Tutors Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="font-playfair text-xl flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" /> Verified Educators
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tutors.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-xl bg-muted/20">
                  <GraduationCap className="w-8 h-8 mx-auto text-muted-foreground stroke-1 mb-2" />
                  <p className="text-sm text-muted-foreground italic">{CONFIG.MESSAGES.NO_TUTORS}</p>
                </div>
              ) : (
                tutors.map((tutor) => (
                  <div key={tutor.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary">
                      {tutor.full_name?.[0] || 'E'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tutor.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{tutor.subjects?.join(', ') || 'General FET'}</p>
                    </div>
                    <div className="flex items-center text-amber-500 gap-0.5 text-xs font-medium">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{tutor.rating || '5.0'}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
