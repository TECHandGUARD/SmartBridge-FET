import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Clock, BookOpen, User, ExternalLink, AlertTriangle, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import PropTypes from 'prop-types';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ============================================================
// PropTypes
// ============================================================

const propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string,
    email: PropTypes.string.isRequired,
    full_name: PropTypes.string,
  }).isRequired,
};

// ============================================================
// ✅ FIXED: Local timezone-aware date helpers
// ============================================================

const getLocalYYYYMMDD = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split('T')[0];
};

const getTodayStr = () => getLocalYYYYMMDD(new Date());
const getTomorrowStr = () => {
  const tmr = new Date();
  tmr.setDate(tmr.getDate() + 1);
  return getLocalYYYYMMDD(tmr);
};

const getDateDisplay = (dateStr) => {
  // Parse date string in local timezone
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

// ============================================================
// Main Component
// ============================================================

export default function UpcomingSessionsWidget({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ============================================================
  // Load Bookings
  // ============================================================

  const loadBookings = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const todayStr = getTodayStr();
      const { data, error: queryError } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('tutor_email', user.email)
        .gte('date', todayStr)
        .order('date', { ascending: true })
        .limit(50);
      
      if (queryError) throw queryError;
      setBookings(data || []);
    } catch (err) {
      console.error('Error loading bookings:', err);
      setError('Failed to load upcoming sessions');
      toast.error('Failed to load upcoming sessions');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // ============================================================
  // ✅ FIXED: Channel Isolation with unique ID
  // ============================================================

  useEffect(() => {
    loadBookings();
    
    if (!user?.email) return;
    
    // ✅ Unique channel name with user ID to prevent ghost subscriptions
    const channelName = `tutor_upcoming_sessions_${user.id || user.email}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tutor_bookings',
          filter: `tutor_email=eq.${user.email}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // ✅ FIXED: Defensive lookup to prevent duplicates
            setBookings(prev => {
              if (prev.some(b => b.id === payload.new.id)) return prev;
              return [...prev, payload.new].sort((a, b) => a.date.localeCompare(b.date));
            });
          } else if (payload.eventType === 'UPDATE') {
            setBookings(prev => prev.map(b => b.id === payload.new.id ? payload.new : b));
          } else if (payload.eventType === 'DELETE') {
            setBookings(prev => prev.filter(b => b.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, user?.id, loadBookings]);

  // ============================================================
  // Memoized Calculations
  // ============================================================

  const todayStr = getTodayStr();
  const tomorrowStr = getTomorrowStr();

  const upcoming = useMemo(() => {
    return bookings
      .filter(b => b.date >= todayStr && (b.status === 'confirmed' || b.status === 'pending'))
      .slice(0, 5);
  }, [bookings, todayStr]);

  const todaySessions = useMemo(() => {
    return upcoming.filter(b => b.date === todayStr);
  }, [upcoming, todayStr]);

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" /> Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Error State
  // ============================================================

  if (error) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" /> Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            className="mt-3" 
            onClick={loadBookings}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Empty State
  // ============================================================

  if (upcoming.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" /> Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No upcoming sessions scheduled.</p>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" /> Upcoming Sessions
            <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-500" /> Private
            </Badge>
          </CardTitle>
          {todaySessions.length > 0 && (
            <Badge className="bg-red-100 text-red-700 border-red-200 animate-pulse text-xs gap-1 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800">
              <AlertTriangle className="w-3 h-3" /> {todaySessions.length} today
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {upcoming.length} upcoming session{upcoming.length !== 1 ? 's' : ''}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {upcoming.map(b => {
          const isToday = b.date === todayStr;
          const isTomorrow = b.date === tomorrowStr;
          const displayDate = getDateDisplay(b.date);

          return (
            <div key={b.id} className={`p-3 rounded-xl border transition-colors ${
              isToday ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20' : 
              isTomorrow ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20' : 
              'border-border bg-muted/30 dark:bg-muted/20'
            }`}>
              <div className="flex items-start gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isToday ? 'bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400' : 
                  'bg-primary/10 text-primary'
                }`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{b.time}</span>
                    <Badge className={`text-[10px] ${
                      isToday ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 
                      isTomorrow ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : 
                      'bg-muted text-muted-foreground'
                    }`}>
                      {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : displayDate}
                    </Badge>
                    <Badge className={`text-[10px] ${
                      b.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : 
                      'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300'
                    }`}>
                      {b.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{b.subject}</span>
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{b.student_email}</span>
                    <span>{b.duration_hours}h</span>
                  </div>
                </div>
                {b.session_link && isToday && (
                  <a href={b.session_link} target="_blank" rel="noopener noreferrer">
                    <Button 
                      type="button"
                      size="sm" 
                      className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                    >
                      <ExternalLink className="w-3 h-3" /> Join
                    </Button>
                  </a>
                )}
              </div>
            </div>
          );
        })}
        
        {bookings.length > 5 && (
          <p className="text-center text-[10px] text-muted-foreground pt-1">
            +{bookings.length - 5} more upcoming sessions
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Add PropTypes
UpcomingSessionsWidget.propTypes = propTypes;
