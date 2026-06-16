import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function BookingCalendar({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selected, setSelected] = useState(null);

  const loadBookings = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const { data, error: bookingsError } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('tutor_email', user.email)
        .order('date', { ascending: true });
      
      if (bookingsError) throw bookingsError;
      setBookings(data || []);
    } catch (err) {
      console.error('Error loading bookings:', err);
      setError('Failed to load calendar');
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // Real-time subscription for booking updates
  useEffect(() => {
    loadBookings();
    
    if (!user?.email) return;
    
    const channel = supabase
      .channel('booking_calendar')
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
            setBookings(prev => [...prev, payload.new]);
            toast.info(`New booking from ${payload.new.student_email}`);
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

  const confirm = async (booking) => {
    try {
      const { error } = await supabase
        .from('tutor_bookings')
        .update({ 
          status: 'confirmed', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', booking.id);
      
      if (error) throw error;
      
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'confirmed' } : b));
      toast.success('Booking confirmed!');
    } catch (err) {
      console.error('Error confirming booking:', err);
      toast.error('Failed to confirm booking');
    }
  };

  const cancel = async (booking) => {
    try {
      const { error } = await supabase
        .from('tutor_bookings')
        .update({ 
          status: 'cancelled', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', booking.id);
      
      if (error) throw error;
      
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b));
      toast.info('Booking cancelled.');
    } catch (err) {
      console.error('Error cancelling booking:', err);
      toast.error('Failed to cancel booking');
    }
  };

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
    setSelected(null);
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
    setSelected(null);
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const bookingsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookings.filter(b => b.date === dateStr);
  };

  const selectedBookings = selected ? bookingsForDay(selected) : [];

  const statusColor = (status) => {
    const styles = {
      confirmed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      completed: 'bg-blue-100 text-blue-700',
      pending: 'bg-amber-100 text-amber-700',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> Booking Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> Booking Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadBookings}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> Booking Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium w-32 text-center">{MONTHS[month]} {year}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">
              {d}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dayBookings = bookingsForDay(day);
            const isToday = new Date().getDate() === day && 
                           new Date().getMonth() === month && 
                           new Date().getFullYear() === year;
            const isSelected = selected === day;
            
            return (
              <button
                key={day}
                onClick={() => setSelected(isSelected ? null : day)}
                className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors
                  ${isToday ? 'bg-primary text-primary-foreground font-bold' : ''}
                  ${isSelected && !isToday ? 'bg-primary/10 ring-1 ring-primary' : ''}
                  ${!isToday && !isSelected ? 'hover:bg-muted' : ''}`}
              >
                {day}
                {dayBookings.length > 0 && (
                  <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-primary'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day bookings */}
        {selected && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm font-semibold mb-2">
              {MONTHS[month]} {selected} — {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''}
            </p>
            {selectedBookings.length === 0 ? (
              <p className="text-xs text-muted-foreground">No bookings for this day.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedBookings.map(b => (
                  <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{b.time} · {b.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.student_email} · {b.duration_hours}h{b.amount ? ` · R${b.amount}` : ''}
                      </p>
                      {b.message && <p className="text-xs text-muted-foreground italic truncate">"{b.message}"</p>}
                    </div>
                    <Badge className={`text-xs flex-shrink-0 ${statusColor(b.status)}`}>{b.status}</Badge>
                    {b.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => confirm(b)}>
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => cancel(b)}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending count banner */}
        {pendingCount > 0 && !selected && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-700 font-medium">
              {pendingCount} pending booking request{pendingCount !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}