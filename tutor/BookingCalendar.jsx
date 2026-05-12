import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function BookingCalendar({ user }) {
  const [bookings, setBookings] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tutor_bookings')
          .select('*')
          .eq('tutor_email', user.email)
          .order('booking_date', { ascending: false });
        
        if (error) throw error;
        setBookings(data || []);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        toast.error('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookings();
  }, [user]);

  const confirm = async (booking) => {
    try {
      const { error } = await supabase
        .from('tutor_bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id);
      
      if (error) throw error;
      
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'confirmed' } : b));
      toast.success('Booking confirmed!');
    } catch (error) {
      console.error('Error confirming booking:', error);
      toast.error('Failed to confirm booking');
    }
  };

  const cancel = async (booking) => {
    try {
      const { error } = await supabase
        .from('tutor_bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);
      
      if (error) throw error;
      
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b));
      toast.info('Booking cancelled.');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const bookingsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return bookings.filter(b => b.booking_date === dateStr);
  };

  const selectedBookings = selected ? bookingsForDay(selected) : [];

  const statusColor = (s) => {
    if (s === 'confirmed') return 'bg-green-100 text-green-700';
    if (s === 'cancelled') return 'bg-red-100 text-red-700';
    if (s === 'completed') return 'bg-blue-100 text-blue-700';
    return 'bg-amber-100 text-amber-700';
  };

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
          {DAYS.map(d => <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">{d}</div>)}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dayBookings = bookingsForDay(day);
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
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
            <p className="text-sm font-semibold mb-2">{MONTHS[month]} {selected} — {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''}</p>
            {selectedBookings.length === 0 ? (
              <p className="text-xs text-muted-foreground">No bookings for this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedBookings.map(b => (
                  <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{b.booking_time} · {b.subject}</p>
                      <p className="text-xs text-muted-foreground">{b.student_email} · {b.duration}h{b.total_amount ? ` · R${b.total_amount}` : ''}</p>
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

        {/* Pending count */}
        {bookings.filter(b => b.status === 'pending').length > 0 && !selected && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-700 font-medium">
              {bookings.filter(b => b.status === 'pending').length} pending booking request{bookings.filter(b => b.status === 'pending').length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}