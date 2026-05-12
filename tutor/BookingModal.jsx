import { useState } from 'react';
import { supabase } from '@/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarDays, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function BookingModal({ tutor, user, open, onClose }) {
  const [form, setForm] = useState({ subject: tutor?.subjects?.[0] || '', date: '', time: '09:00', duration_hours: 1, message: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!form.date || !form.subject) { toast.error('Please fill in all required fields.'); return; }
    if (!user) { window.location.href = '/login'; return; }
    setLoading(true);
    
    try {
      // Create booking in Supabase
      const { error } = await supabase
        .from('tutor_bookings')
        .insert({
          student_email: user.email,
          tutor_email: tutor.user_email,
          tutor_name: tutor.full_name,
          subject: form.subject,
          booking_date: form.date,
          booking_time: form.time,
          duration: Number(form.duration_hours),
          status: 'pending',
          message: form.message,
          total_amount: tutor.hourly_rate ? tutor.hourly_rate * Number(form.duration_hours) : 0,
        });
      
      if (error) throw error;
      
      // Log activity
      await supabase.from('activity_logs').insert({
        event_type: 'booking_made',
        user_email: user.email,
        description: `${user.email} booked ${tutor.full_name} for ${form.subject} on ${form.date}`,
      }).catch(() => {});
      
      setDone(true);
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
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
            <div>
              <Label>Subject *</Label>
              <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {(tutor?.subjects || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={form.date} min={new Date().toISOString().split('T')[0]} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Duration (hours)</Label>
              <Select value={String(form.duration_hours)} onValueChange={v => setForm(f => ({ ...f, duration_hours: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3].map(h => <SelectItem key={h} value={String(h)}>{h} hour{h > 1 ? 's' : ''}{tutor?.hourly_rate ? ` — R${tutor.hourly_rate * h}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message (optional)</Label>
              <Input placeholder="Any specific topics or notes..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            </div>
            {tutor?.hourly_rate && (
              <div className="bg-primary/5 rounded-xl p-3 text-sm">
                <span className="text-muted-foreground">Estimated cost: </span>
                <span className="font-bold text-primary">R{tutor.hourly_rate * form.duration_hours}</span>
              </div>
            )}
            <Button onClick={submit} disabled={loading} className="w-full bg-primary gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
              {loading ? 'Sending...' : 'Request Booking'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}