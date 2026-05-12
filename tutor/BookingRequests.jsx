import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, CheckCircle, XCircle, User, BookOpen, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

export default function BookingRequests({ user }) {
  const [bookings, setBookings] = useState([]);
  const [tutorProfile, setTutorProfile] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    
    fetchBookings();
    fetchTutorProfile();

    // Set up real-time subscription for new/updated bookings
    const subscription = supabase
      .channel('tutor-bookings')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tutor_bookings',
        filter: `tutor_email=eq.${user.email}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setBookings(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setBookings(prev => prev.map(b => b.id === payload.new.id ? payload.new : b));
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.email]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('tutor_email', user.email)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchTutorProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('user_email', user.email)
        .maybeSingle();
      
      if (error) throw error;
      setTutorProfile(data);
    } catch (error) {
      console.error('Error fetching tutor profile:', error);
    }
  };

  const accept = async (booking) => {
    setProcessing(booking.id);
    try {
      const sessionLink = tutorProfile?.zoom_link || tutorProfile?.teams_link || '';
      
      const { error } = await supabase
        .from('tutor_bookings')
        .update({ status: 'confirmed', session_link: sessionLink })
        .eq('id', booking.id);
      
      if (error) throw error;
      
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'confirmed', session_link: sessionLink } : b));
      
      // TODO: Send confirmation email via Supabase Edge Function
      console.log(`Booking confirmed for ${booking.student_email}`);
      toast.success('Booking confirmed! Student will be notified.');
    } catch (error) {
      console.error('Error confirming booking:', error);
      toast.error('Failed to confirm booking');
    } finally {
      setProcessing(null);
    }
  };

  const decline = async (booking) => {
    setProcessing(booking.id);
    try {
      const { error } = await supabase
        .from('tutor_bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);
      
      if (error) throw error;
      
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b));
      toast.info('Booking declined.');
    } catch (error) {
      console.error('Error declining booking:', error);
      toast.error('Failed to decline booking');
    } finally {
      setProcessing(null);
    }
  };

  const markComplete = async (booking) => {
    setProcessing(booking.id);
    try {
      const { error } = await supabase
        .from('tutor_bookings')
        .update({ status: 'completed' })
        .eq('id', booking.id);
      
      if (error) throw error;
      
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'completed' } : b));
      toast.success('Session marked as completed.');
    } catch (error) {
      console.error('Error marking booking as complete:', error);
      toast.error('Failed to mark as completed');
    } finally {
      setProcessing(null);
    }
  };

  const sessionLink = tutorProfile?.zoom_link || tutorProfile?.teams_link || null;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-playfair text-lg flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> Booking Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="font-playfair text-lg flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" /> Booking Requests
          {pendingCount > 0 && (
            <Badge className="bg-red-100 text-red-700 animate-pulse text-xs ml-1">{pendingCount} pending</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No booking requests yet. Students will appear here when they book you.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => {
              const isProcessing = processing === b.id;
              return (
                <div key={b.id} className={`p-4 rounded-xl border ${b.status === 'pending' ? 'border-amber-200 bg-amber-50/50' : 'border-border bg-muted/30'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{b.student_email}</p>
                        <Badge className={`text-xs ${STATUS_STYLES[b.status]}`}>{b.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{b.subject}</span>
                        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{b.booking_date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.booking_time} · {b.duration}h</span>
                        {b.total_amount > 0 && <span className="font-medium text-primary">R{b.total_amount}</span>}
                      </div>
                      {b.message && <p className="text-xs text-muted-foreground mt-1 italic">"{b.message}"</p>}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {b.status === 'confirmed' && sessionLink && (
                        <a href={sessionLink} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="text-xs gap-1 h-8 bg-green-600 hover:bg-green-700 text-white">
                            <ExternalLink className="w-3.5 h-3.5" /> Join Session
                          </Button>
                        </a>
                      )}
                      {b.status === 'confirmed' && (
                        <Button size="sm" variant="outline" className="text-xs gap-1 h-8" disabled={isProcessing} onClick={() => markComplete(b)}>
                          <CheckCircle className="w-3.5 h-3.5" /> Complete
                        </Button>
                      )}
                      {b.status === 'pending' && (
                        <>
                          <Button size="sm" variant="outline" className="text-xs gap-1 h-8 text-red-700 border-red-200" disabled={isProcessing} onClick={() => decline(b)}>
                            <XCircle className="w-3.5 h-3.5" /> Decline
                          </Button>
                          <Button size="sm" className="text-xs gap-1 h-8 bg-green-600 hover:bg-green-700 text-white" disabled={isProcessing} onClick={() => accept(b)}>
                            <CheckCircle className="w-3.5 h-3.5" /> Accept
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}