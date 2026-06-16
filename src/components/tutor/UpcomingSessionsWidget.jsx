import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Clock, BookOpen, User, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function UpcomingSessionsWidget({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('tutor_email', user.email)
        .order('date', { ascending: true })
        .limit(50);
      
      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error('Error loading bookings:', err);
      toast.error('Failed to load upcoming sessions');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // Set up real-time subscription for booking updates
  useEffect(() => {
    loadBookings();
    
    if (!user?.email) return;
    
    const channel = supabase
      .channel('tutor_upcoming_sessions')
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
            setBookings(prev => [...prev, payload.new].sort((a, b) => a.date.localeCompare(b.date)));
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
  }, [user?.email, loadBookings]);

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return bookings
      .filter(b => b.date >= today && (b.status === 'confirmed' || b.status === 'pending'))
      .slice(0, 5);
  }, [bookings]);

  const todaySessions = upcoming.filter(b => b.date === new Date().toISOString().split('T')[0]);

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

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-playfair flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" /> Upcoming Sessions
          </CardTitle>
          {todaySessions.length > 0 && (
            <Badge className="bg-red-100 text-red-700 border-red-200 animate-pulse text-xs gap-1">
              <AlertTriangle className="w-3 h-3" /> {todaySessions.length} today
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcoming.map(b => {
          const isToday = b.date === new Date().toISOString().split('T')[0];
          const isTomorrow = (() => {
            const tmr = new Date();
            tmr.setDate(tmr.getDate() + 1);
            return b.date === tmr.toISOString().split('T')[0];
          })();

          return (
            <div key={b.id} className={`p-3 rounded-xl border transition-colors ${
              isToday ? 'border-red-200 bg-red-50/50' : isTomorrow ? 'border-amber-200 bg-amber-50/50' : 'border-border bg-muted/30'
            }`}>
              <div className="flex items-start gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isToday ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
                }`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{b.time}</span>
                    <Badge className={`text-[10px] ${
                      isToday ? 'bg-red-100 text-red-700' : isTomorrow ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'
                    }`}>
                      {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : b.date}
                    </Badge>
                    <Badge className={`text-[10px] ${b.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
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
                    <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700">
                      <ExternalLink className="w-3 h-3" /> Join
                    </Button>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}