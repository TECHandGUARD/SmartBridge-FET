import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarDays, Loader2, CheckCircle, AlertCircle, Shield, Clock } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const MIN_BOOKING_HOURS = 1;
const MAX_BOOKING_HOURS = 3;

// ============================================================
// Main Component
// ============================================================

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
  const [tutorAvailability, setTutorAvailability] = useState(null);
  const [error, setError] = useState(null);

  // ============================================================
  // Check Availability
  // ============================================================

  const checkAvailability = useCallback(async () => {
    if (!form.date || !form.time || !tutor?.user_email) return;

    setCheckingAvailability(true);
    setConflictingBooking(null);
    setTutorAvailability(null);
    setError(null);

    try {
      // Get day of week
      const dateObj = new Date(form.date);
      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

      // Check tutor availability for this day
      const { data: availability, error: availError } = await supabase
        .from('tutor_availability')
        .select('*')
        .eq('tutor_email', tutor.user_email)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true)
        .maybeSingle();

      if (availError) throw availError;

      if (!availability) {
        setTutorAvailability(null);
        setError(`Tutor is not available on ${dayOfWeek}s. Please choose another day.`);
        return;
      }

      setTutorAvailability(availability);

      // Check if selected time is within availability window
      const selectedTime = form.time;
      if (selectedTime < availability.start_time || selectedTime > availability.end_time) {
        setError(`Tutor is only available from ${availability.start_time} to ${availability.end_time} on ${dayOfWeek}s.`);
        return;
      }

      // Check for overlapping confirmed bookings
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
        setError(`This time conflicts with an existing session at ${overlapping.time}.`);
        return;
      }

      // All checks passed
      setError(null);

    } catch (err) {
      console.error('Error checking availability:', err);
      setError('Failed to check availability. Please try again.');
    } finally {
      setCheckingAvailability(false);
    }
  }, [form.date, form.time, tutor?.user_email]);

  useEffect(() => {
    if (form.date && form.time) {
      checkAvailability();
    }
  }, [checkAvailability, form.date, form.time]);

  // ============================================================
  // Submit Booking
  // ============================================================

  const submit = async () => {
    // Validate required fields
    if (!form.date) {
      toast.error('Please select a date.');
      return;
    }

    if (!form.subject) {
      toast.error('Please select a subject.');
      return;
    }

    if (!user) {
      toast.error('Please sign in to book a session.');
      window.location.href = '/login';
      return;
    }

    // Check for conflicts
    if (conflictingBooking) {
      toast.error(`This time conflicts with an existing session at ${conflictingBooking.time}`);
      return;
    }

    if (error) {
      toast.error(error);
      return;
    }

    setLoading(true);

    try {
      // Calculate amount
      const hourlyRate = tutor?.hourly_rate || 0;
      const amount = hourlyRate * Number(form.duration_hours);

      // Create the booking
      const { data: booking, error: bookingError } = await supabase
        .from('tutor_bookings')
        .insert({
          student_email: user.email,
          student_name: user.full_name || user.email,
          tutor_email: tutor.user_email,
          tutor_name: tutor.full_name,
          subject: form.subject,
          date: form.date,
          time: form.time,
          duration_hours: Number(form.duration_hours),
          status: 'pending',
          message: form.message?.trim() || null,
          amount: amount,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Log activity for POPIA compliance
      await supabase
        .from('activity_log')  // ✅ Fixed: singular table name
        .insert({
          event_type: 'booking_made',
          user_email: user.email,
          user_id: user.id || null,
          description: `${user.email} booked ${tutor.full_name} for ${form.subject} on ${form.date}`,
          metadata: {
            tutor_email: tutor.user_email,
            subject: form.subject,
            date: form.date,
            time: form.time,
            duration: form.duration_hours,
            amount: amount
          }
        })
        .catch(err => console.warn('Activity log error:', err));

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
💰 Amount: R${amount}

Message from student: ${form.message || 'No message'}

Please log in to confirm or decline this booking.

— ${appName}
          `,
          from_name: appName
        }
      });

      if (notifyError) console.error('Email notification error:', notifyError);

      setLoading(false);
      setDone(true);

      if (onBookingCreated) onBookingCreated(booking);

    } catch (err) {
      console.error('Booking error:', err);
      toast.error(err.message || 'Failed to create booking. Please try again.');
      setLoading(false);
    }
  };

  // ============================================================
  // Reset Form on Close
  // ============================================================

  const handleClose = () => {
    if (!loading) {
      setDone(false);
      setError(null);
      setConflictingBooking(null);
      onClose();
    }
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-playfair flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Book a Session
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            with {tutor?.full_name} · {tutor?.hourly_rate ? `R${tutor.hourly_rate}/hr` : ''}
          </p>
        </DialogHeader>

        {done ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <p className="font-playfair text-xl font-bold mb-1">Booking Sent! 🎉</p>
            <p className="text-sm text-muted-foreground">
              Your request has been sent to {tutor?.full_name}. They will confirm shortly.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              You'll receive a confirmation email once the tutor accepts.
            </p>
            <Button className="mt-4 w-full bg-primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 dark:bg-red-950/20 dark:border-red-800">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Subject Selection */}
            <div className="space-y-1">
              <Label className="text-sm">Subject *</Label>
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
              <div className="space-y-1">
                <Label className="text-sm">Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Time *</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                />
              </div>
            </div>

            {/* Availability Status */}
            {checkingAvailability && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking availability...
              </div>
            )}

            {tutorAvailability && !error && !conflictingBooking && form.date && form.time && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2 dark:bg-green-950/20 dark:border-green-800">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <p className="text-xs text-green-700 dark:text-green-300">
                  ✓ Available! Tutor is free at this time.
                </p>
              </div>
            )}

            {/* Conflict Warning */}
            {conflictingBooking && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-2 dark:bg-red-950/20 dark:border-red-800">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-300">
                  This time conflicts with an existing session at {conflictingBooking.time}.
                  Please choose a different time.
                </p>
              </div>
            )}

            {/* Duration */}
            <div className="space-y-1">
              <Label className="text-sm">Duration</Label>
              <Select
                value={String(form.duration_hours)}
                onValueChange={v => setForm(f => ({ ...f, duration_hours: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: MAX_BOOKING_HOURS - MIN_BOOKING_HOURS + 1 }, (_, i) => i + MIN_BOOKING_HOURS).map(h => (
                    <SelectItem key={h} value={String(h)}>
                      {h} hour{h > 1 ? 's' : ''}
                      {tutor?.hourly_rate ? ` — R${tutor.hourly_rate * h}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div className="space-y-1">
              <Label className="text-sm">Message (optional)</Label>
              <Input
                placeholder="Any specific topics or notes..."
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                maxLength={500}
              />
              <p className="text-[10px] text-muted-foreground text-right">
                {form.message?.length || 0}/500
              </p>
            </div>

            {/* Cost Estimate */}
            {tutor?.hourly_rate && tutor.hourly_rate > 0 && (
              <div className="bg-primary/5 rounded-xl p-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimated cost</span>
                <span className="font-bold text-primary text-lg">
                  R{tutor.hourly_rate * form.duration_hours}
                </span>
              </div>
            )}

            {/* Privacy Note */}
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Shield className="w-3 h-3 text-green-500" />
              Your personal information is secure and will only be shared with the tutor.
            </div>

            {/* Submit Button */}
            <Button
              onClick={submit}
              disabled={loading || !form.date || !form.subject || !!conflictingBooking || !!error || checkingAvailability}
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
