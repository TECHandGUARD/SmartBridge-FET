import SponsorshipChoice from '@/components/student/SponsorshipChoice';
import { tutorRate, rateLabel, bookingEstimate } from '@/lib/tutor-pricing';
import { bookingRequest as prepareRequest } from '@/lib/booking-request';
import { createBooking } from '@/lib/bookings';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarDays, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function BookingModal({ tutor, user, open, onClose, onBookingCreated = undefined }) {
  const [form, setForm] = useState({
    subject: tutor?.subjects?.[0] || '',
    date: '',
    time: '09:00',
    duration_hours: 1,
    message: '', is_intro: false, sponsorship_allocation_id: ''
  });
  const bookingRequest = useRef(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (open) { setDone(false); setForm({subject: tutor?.subjects?.[0] || '',date:'',time:'09:00',duration_hours:1,message:'',is_intro:false,sponsorship_allocation_id:''}); bookingRequest.current=null; }
  }, [open, tutor?.id]);

  const rate = tutorRate(tutor, form.subject);
  const estimate = bookingEstimate(tutor, form);
  const submit = async () => {
    if (loading) return;
    if (!form.date || !form.subject) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (!user) {
      window.location.href = '/login';
      return;
    }

    setLoading(true);

    try {
      bookingRequest.current = prepareRequest(bookingRequest.current, tutor, form);
      const booking = await createBooking(tutor, form, bookingRequest.current.id);
      bookingRequest.current = null;
      setDone(true);
      setLoading(false);

      if (onBookingCreated) onBookingCreated(booking);

    } catch (err) {
      console.error('Booking error:', err);
      toast.error(err.message || 'Failed to create booking. Please try again.');
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

            {tutor?.offers_free_intro && <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
              <input type="checkbox" checked={form.is_intro} className="mt-1" onChange={e => setForm(f => ({...f, is_intro: e.target.checked, duration_hours: e.target.checked ? 0.5 : 1}))} />
              <span>Free 30-minute introduction<span className="block text-xs text-muted-foreground">One per learner and tutor. Eligibility is checked when you submit.</span></span>
            </label>}
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

            <p className="text-xs text-muted-foreground">Availability and price are checked when you submit. Session times use South African time.</p>

            {/* Duration */}
            <div>
              <Label>Duration (hours)</Label>
              <Select disabled={form.is_intro} value={String(form.duration_hours)} onValueChange={v => setForm(f => ({ ...f, duration_hours: Number(v) }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(form.is_intro ? [0.5] : [0.5, 1, 1.5, 2, 3, 4]).map(h => (
                    <SelectItem key={h} value={String(h)}>
                      {h} hour{h > 1 ? 's' : ''}
                      {rate !== null && Number.isFinite(rate) && !form.is_intro ? ` — R${(rate * h).toFixed(2)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <SponsorshipChoice value={form.sponsorship_allocation_id || ""} onChange={v=>setForm(f=>({...f,sponsorship_allocation_id:v}))} disabled={form.is_intro || estimate===0} refreshKey={String(open)} />
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
            <div className="bg-primary/5 rounded-xl p-3 text-sm" aria-live="polite">
              <span className="text-muted-foreground">Estimated cost: </span>
              <span className="font-bold text-primary">{estimate === null ? 'Rate not set — contact the tutor' : estimate === 0 ? 'Free' : `R${estimate.toFixed(2)}`}</span>
              {!form.is_intro && <p className="text-xs text-muted-foreground">{rateLabel(rate)} · Final price checked when you submit.</p>}
            </div>

            {/* Submit Button */}
            <Button
              onClick={submit}
              disabled={loading || !form.date || !form.subject || estimate === null}
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
