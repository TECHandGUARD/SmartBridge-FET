import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarDays, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function BookingModal({ tutor, user, open, onClose, onBookingCreated }) {
  const [form, setForm] = useState({ 
    subject: tutor?.subjects?.[0] || '', 
    date: '', 
    time: '09:00', 
    duration_hours: 1, 
    message: '' 
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [conflictingBooking, setConflictingBooking] = useState(null);

  // Check tutor availability when date/time changes
  useEffect(() => {
    if (!form.date || !form.time || !tutor?.user_email) return;
    
    const checkAvailability = async () => {
      setCheckingAvailability(true);
      setConflictingBooking(null);
      
      try {
        // Check if tutor has availability set for this day/time
        const dayOfWeek = new Date(form.date).toLocaleDateString('en-US', { weekday: 'long' });
        
        const { data: availability, error: availError } = await supabase
          .from('tutor_availability')
          .select('*')
          .eq('tutor_email', tutor.user_email)
          .eq('day_of_week', dayOfWeek)
          .eq('is_available', true)
          .maybeSingle();
        
        if (availError) throw availError;
        
        // Check for overlapping bookings
        const { data: overlapping, error: overlapError } = await supabase
          .from('tutor_bookings')
          .select('*')
          .eq('tutor_email', tutor.user_email)
          .eq('date', form.date)
          .eq('status', 'confirmed')
          .maybeSingle();
        
        if (overlapError) throw overlapError;
        
        if (overlapping) {
          setConflictingBooking(overlapping);
        }
      } catch (err) {
        console.error('Error checking availability:', err);
      } finally {
        setCheckingAvailability(false);
      }
    };
    
    checkAvailability();
  }, [form.date, form.time, tutor?.user_email]);

  const submit = async () => {
    if (!form.date || !form.subject) { 
      toast.error('Please fill in all required fields.'); 
      return; 
    }
    
    if (!user) { 
      window.location.href = '/login';
      return; 
    }
    
    // Check if trying to book a conflicting time
    if (conflictingBooking) {
      toast.error(`This time conflicts with an existing session at ${conflictingBooking.time}`);
      return;
    }
    
    setLoading(true);
    
    try {
      // Create the booking
      const { data: booking, error: bookingError } = await supabase
        .from('tutor_bookings')
        .insert({
          student_email: user.email,
          tutor_email: tutor.user_email,
          tutor_name: tutor.full_name,
          subject: form.subject,
          date: form.date,
          time: form.time,
          duration_hours: Number(form.duration_hours),
          status: 'pending',
          message: form.message || null,
          amount: tutor.hourly_rate ? tutor.hourly_rate * Number(form.duration_hours) : 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (bookingError) throw bookingError;
      
      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          event_type: 'booking_made',
          user_email: user.email,
          description: `${user.email} booked ${tutor.full_name} for ${form.subject} on ${form.date}`,
          created_at: new Date().toISOString()
        })
        .catch(err => console.error('Activity log error:', err));
      
      // Send notification to tutor via Edge Function
      const { error: notifyError } = await supabase.functions.invoke('send-email', {
        body: {
          to: tutor.user_email,
          subject: `📚 New Booking Request: ${form.subject} with ${user.full_name || user.email}`,
          body: `
Hi ${tutor.full_name},

You have a new booking request!

📖 Subject: ${form.subject}
📅 Date: ${form.date}
⏰ Time: ${form.time}
⏱ Duration: ${form.duration_hours} hour(s)
👤 Student: ${user.full_name || user.email}

Message from student: ${form.message || 'No message'}

Please log in to confirm or decline this booking.

— SmartBridge FET
          `,
          from_name: 'SmartBridge FET'
        }
      });
      
      if (notifyError) console.error('Email notification error:', notifyError);
      
      setLoading(false);
      setDone(true);
      
      if (onBookingCreated) onBookingCreated(booking);
      
    } catch (err) {
      console.error('Booking error:', err);
      toast.error('Failed to create booking. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-playfair">Book a Session with {tutor?.full_name}</DialogTitle>
        </DialogHeader>
        
        {done ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <p className="font-playfair text-xl font-bold mb-1">Booking Sent!</p>
            <p className="text-sm text-muted-foreground">Your request has been sent. The tutor will confirm shortly.</p>
            <Button className="mt-4 w-full bg-primary" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Subject Selection */}
            <div>
              <Label>Subject *</Label>
              <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {(tutor?.subjects || []).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date *</Label>
                <Input 
                  type="date" 
                  value={form.date} 
                  min={new Date().toISOString().split('T')[0]} 
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} 
                />
              </div>
              <div>
                <Label>Time *</Label>
                <Input 
                  type="time" 
                  value={form.time} 
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))} 
                />
              </div>
            </div>
            
            {/* Availability Warning */}
            {checkingAvailability && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking availability...
              </div>
            )}
            
            {conflictingBooking && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">
                  This time conflicts with an existing session at {conflictingBooking.time}.
                  Please choose a different time.
                </p>
              </div>
            )}
            
            {/* Duration */}
            <div>
              <Label>Duration (hours)</Label>
              <Select value={String(form.duration_hours)} onValueChange={v => setForm(f => ({ ...f, duration_hours: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3].map(h => (
                    <SelectItem key={h} value={String(h)}>
                      {h} hour{h > 1 ? 's' : ''}
                      {tutor?.hourly_rate ? ` — R${tutor.hourly_rate * h}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Message */}
            <div>
              <Label>Message (optional)</Label>
              <Input 
                placeholder="Any specific topics or notes..." 
                value={form.message} 
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))} 
              />
            </div>
            
            {/* Cost Estimate */}
            {tutor?.hourly_rate && (
              <div className="bg-primary/5 rounded-xl p-3 text-sm">
                <span className="text-muted-foreground">Estimated cost: </span>
                <span className="font-bold text-primary">
                  R{tutor.hourly_rate * form.duration_hours}
                </span>
              </div>
            )}
            
            {/* Submit Button */}
            <Button 
              onClick={submit} 
              disabled={loading || !form.date || !form.subject || !!conflictingBooking} 
              className="w-full bg-primary gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
              {loading ? 'Sending...' : 'Request Booking'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}