import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, Loader2, AlertCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ============================================================
// Constants
// ============================================================

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ============================================================
// Helper Functions
// ============================================================

const statusColor = (status) => {
  const styles = {
    confirmed: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
  };
  return styles[status] || 'bg-muted text-muted-foreground';
};

// ============================================================
// Main Component
// ============================================================

export default function BookingCalendar({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selected, setSelected] = useState(null);
  const [processingId, setProcessingId] = useState(null);

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

  // ============================================================
  // Real-time Subscription
  // ============================================================

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

  // ============================================================
  // Confirm Booking
  // ============================================================

  const confirm = async (booking) => {
    setProcessingId(booking.id);

    try {
      const { error: updateError } = await supabase
        .from('tutor_bookings')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'confirmed' } : b));

      // Log activity for POPIA compliance
      await Promise.resolve(supabase
        .from('activity_log')
        .insert({
          event_type: 'booking_confirmed',
          user_email: user.email,
          user_id: user.id || null,
          description: `Confirmed booking for ${booking.student_email} - ${booking.subject}`,
          metadata: {
            booking_id: booking.id,
            student_email: booking.student_email,
            subject: booking.subject,
            date: booking.date,
            time: booking.time
          }
        }))
        .catch(() => {});

      toast.success('Booking confirmed!');
    } catch (err) {
      console.error('Error confirming booking:', err);
      toast.error('Failed to confirm booking');
    } finally {
      setProcessingId(null);
    }
  };

  // ============================================================
  // Cancel Booking
  // ============================================================

  const cancel = async (booking) => {
    setProcessingId(booking.id);

    try {
      const { error: updateError } = await supabase
        .from('tutor_bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b));

      // Log activity for POPIA compliance
      await Promise.resolve(supabase
        .from('activity_log')
        .insert({
          event_type: 'booking_cancelled',
          user_email: user.email,
          user_id: user.id || null,
          description: `Cancelled booking for ${booking.student_email} - ${booking.subject}`,
          metadata: {
            booking_id: booking.id,
            student_email: booking.student_email,
            subject: booking.subject
          }
        }))
        .catch(() => {});

      toast.info('Booking cancelled.');
    } catch (err) {
      console.error('Error cancelling booking:', err);
      toast.error('Failed to cancel booking');
    } finally {
      setProcessingId(null);
    }
  };

  // ============================================================
  // Navigation
  // ============================================================

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

  // ============================================================
  // Helpers
  // ============================================================

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const bookingsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookings.filter(b => b.date === dateStr);
  };

  const selectedBookings = selected ? bookingsForDay(selected) : [];
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  // ============================================================
  // Loading State
  // ============================================================

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

  // ============================================================
  // Error State
  // ============================================================

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

  // ============================================================
  // Render
  // ============================================================

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-playfair flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> Booking Calendar
            <Badge variant="outline" className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-500" /> Private
            </Badge>
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
        <p className="text-xs text-muted-foreground">
          {bookings.length} total booking{bookings.length !== 1 ? 's' : ''}
          {pendingCount > 0 && ` · ${pendingCount} pending`}
        </p>
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
                aria-label={`${day} ${MONTHS[month]} ${year} - ${dayBookings.length} bookings`}
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
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">
                {MONTHS[month]} {selected} — {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => setSelected(null)}
              >
                Close
              </Button>
            </div>
            {selectedBookings.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No bookings for this day.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {selectedBookings.map(b => (
                  <div key={b.id} className={`flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 border-l-4 ${
                    b.status === 'pending' ? 'border-amber-400' :
                    b.status === 'confirmed' ? 'border-green-400' :
                    b.status === 'completed' ? 'border-blue-400' :
                    'border-red-400'
                  }`}>
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{b.time} · {b.subject}</p>
                        <Badge className={`text-xs flex-shrink-0 ${statusColor(b.status)}`}>{b.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {b.student_email} · {b.duration_hours}h{b.amount ? ` · R${b.amount}` : ''}
                      </p>
                      {b.message && <p className="text-xs text-muted-foreground italic truncate">"{b.message}"</p>}
                    </div>
                    {b.status === 'pending' && (
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                          onClick={() => confirm(b)}
                          disabled={processingId === b.id}
                        >
                          {processingId === b.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={() => cancel(b)}
                          disabled={processingId === b.id}
                        >
                          {processingId === b.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
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
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 dark:bg-amber-950/20 dark:border-amber-800">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
              {pendingCount} pending booking request{pendingCount !== 1 ? 's' : ''}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs ml-auto border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/20"
              onClick={() => {
                // Find the first pending booking and select its day
                const pendingBooking = bookings.find(b => b.status === 'pending');
                if (pendingBooking) {
                  const day = parseInt(pendingBooking.date.split('-')[2]);
                  setSelected(day);
                }
              }}
            >
              View Pending
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
