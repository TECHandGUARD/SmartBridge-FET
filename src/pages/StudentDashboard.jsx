// src/pages/StudentDashboard.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, Calendar, Clock, Star, FileText, ChevronRight, 
  GraduationCap, TrendingUp, Activity, Loader2, RefreshCw, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',
  
  // Display limits
  RESOURCES_LIMIT: Number(import.meta.env.VITE_STUDENT_RESOURCES_LIMIT) || 6,
  TUTORS_LIMIT: Number(import.meta.env.VITE_STUDENT_TUTORS_LIMIT) || 5,
  BOOKINGS_LIMIT: Number(import.meta.env.VITE_STUDENT_BOOKINGS_LIMIT) || 20,
  
  // Real-time settings
  DEBOUNCE_DELAY: Number(import.meta.env.VITE_STUDENT_DEBOUNCE_DELAY) || 2000,
  POLLING_INTERVAL: Number(import.meta.env.VITE_STUDENT_POLLING_INTERVAL) || 300000, // 5 minutes
  
  // Feature flags
  FEATURES: {
    ENABLE_REAL_TIME: import.meta.env.VITE_STUDENT_ENABLE_REAL_TIME !== 'false',
    ENABLE_POLLING: import.meta.env.VITE_STUDENT_ENABLE_POLLING !== 'false',
    ENABLE_LOGGING: import.meta.env.VITE_STUDENT_ENABLE_LOGGING !== 'false',
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
    COMPONENT_ERROR: import.meta.env.VITE_STUDENT_COMPONENT_ERROR || 'Failed to load this section. Please try again.',
  },
  
  // Currency
  CURRENCY: import.meta.env.VITE_PREMIUM_CURRENCY || 'R',
};

// ============================================================
// Main Component
// ============================================================

export default function StudentDashboard() {
  const { user } = useAuth();

  // ---------- State ----------
  const [resources, setResources] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ---------- Structural Protection Guard Rails ----------
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // ---------- Protected Data Fetching Layer ----------
  const loadStudentData = useCallback(async (isManualRefresh = false) => {
    if (!user?.email) return;

    // Prevent duplicate concurrent executions
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isManualRefresh) {
      setRefreshing(true);
    }

    // Cancel any ongoing network requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const { RESOURCES_LIMIT, TUTORS_LIMIT, BOOKINGS_LIMIT } = CONFIG;

    try {
      // Fetch data concurrently using Promise.allSettled to prevent single-query failure
      const [resourcesRes, bookingsRes, tutorsRes] = await Promise.allSettled([
        supabase
          .from('resources')
          .select('*')
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .limit(RESOURCES_LIMIT),
        
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
          .limit(TUTORS_LIMIT)
      ]);

      // Parse results safely
      if (resourcesRes.status === 'fulfilled' && !resourcesRes.value.error) {
        setResources(resourcesRes.value.data || []);
      } else if (resourcesRes.status === 'fulfilled' && resourcesRes.value.error) {
        console.error('Error loading resources:', resourcesRes.value.error);
      }

      if (bookingsRes.status === 'fulfilled' && !bookingsRes.value.error) {
        setBookings(bookingsRes.value.data || []);
      }

      if (tutorsRes.status === 'fulfilled' && !tutorsRes.value.error) {
        setTutors(tutorsRes.value.data || []);
      }

      // Safe activity logging (with error handling)
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
          // Silently fail - don't break the main flow
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
  }, [user?.email]);

  // ---------- Lifecycle / Subscription Layer (with Debouncing) ----------
  useEffect(() => {
    isMountedRef.current = true;

    if (!user?.email) {
      setLoading(false);
      return;
    }

    // Initial load
    loadStudentData(false);

    // ✅ FIXED: Debounced real-time handler to prevent infinite loops
    const handleRealtimeChange = () => {
      if (!CONFIG.FEATURES.ENABLE_REAL_TIME) return;
      
      // Clear any pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      // Set a new debounce timer
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

    // Lazy fallback polling layer (every 5 minutes)
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
      
      // Clear debounce timer
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
        } catch (e) {
          // Channel already removed
        }
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
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => loadStudentData(true)} 
          disabled={refreshing}
          className="sm:self-center gap-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? CONFIG.MESSAGES.REFRESHING : CONFIG.MESSAGES.REFRESH}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Columns */}
        <div className="lg:col-span-2 space-y-8">
          
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

          {/* Section: Study Materials */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="font-playfair text-xl flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> Curated Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resources.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-xl bg-muted/20">
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground stroke-1 mb-2" />
                  <p className="text-sm text-muted-foreground">{CONFIG.MESSAGES.NO_RESOURCES}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {resources.map((res) => (
                    <div key={res.id} className="p-4 rounded-xl border border-border flex flex-col justify-between hover:border-primary/40 transition-all bg-card group">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px] tracking-wide uppercase px-1.5">{res.grade || 'FET'}</Badge>
                          <span className="text-[11px] font-medium text-primary font-sans">{res.subject}</span>
                        </div>
                        <h3 className="font-medium text-sm text-card-foreground line-clamp-1 group-hover:text-primary transition-colors">{res.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{res.description || 'No summary text provided.'}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground capitalize">{res.type || 'Document'}</span>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2 gap-1 group-hover:translate-x-0.5 transition-transform">
                          View <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
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
