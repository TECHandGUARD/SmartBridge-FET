import { tutorRate, rateLabel, bookingEstimate } from '@/lib/tutor-pricing';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { bookingRequest as prepareRequest } from '@/lib/booking-request';
import { createBooking, cancelBooking } from '@/lib/bookings';
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Plus, Loader2, XCircle, ExternalLink, Star, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import TutorReviewModal from '@/components/student/TutorReviewModal';

const SUBJECT_OPTIONS = ['Mathematics', 'Physical Sciences', 'Life Sciences', 'Accounting', 'Economics', 'History', 'Geography', 'Business Studies'];

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function Bookings() {
  const [cancelId, setCancelId] = useState(null);
  const [cancelMessage, setCancelMessage] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const { user } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);

  const [form, setForm] = useState({
    tutor_email: '',
    subject: 'Mathematics',
    date: '',
    time: '14:00',
    duration_hours: '1',
    message: '', is_intro: false
  });

  useEffect(() => {
    if (!user?.email) return;
    fetchBookingDashboardData();

    // Setup native Supabase realtime websocket channel subscription
    const bookingStreamChannel = supabase
      .channel('live_booking_mutations')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tutor_bookings' },
        (payload) => {
          if (payload.new && ('student_id' in payload.new ? payload.new.student_id : null) === user.id) {
            fetchBookingDashboardData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingStreamChannel);
    };
  }, [user?.email]);

  const fetchBookingDashboardData = async () => {
    try {
      setLoading(true);

      const [bookingsQuery, tutorsQuery] = await Promise.all([
        supabase.from('tutor_bookings').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
        supabase.from('tutor_directory').select('*').eq('is_verified', true)
      ]);

      if (bookingsQuery.error) throw bookingsQuery.error;
      if (tutorsQuery.error) throw tutorsQuery.error;

      setBookings(bookingsQuery.data || []);
      setTutors(tutorsQuery.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to sync with local scheduler databases.');
    } finally {
      setLoading(false);
    }
  };

  const bookingRequest = useRef(null);
  const selectedTutor = tutors.find(t => t.user_email === form.tutor_email);
  const estimatedCost = bookingEstimate(selectedTutor, form);

  const handleCreateBooking = async () => {
    if (isSaving) return;
    if (!selectedTutor?.user_id || !form.date) {
      toast.error('Choose a tutor and session date.');
      return;
    }
    try {
      setIsSaving(true);
      bookingRequest.current = prepareRequest(bookingRequest.current, selectedTutor, form);
      await createBooking(selectedTutor, form, bookingRequest.current.id);
      bookingRequest.current = null;

      toast.success('Booking request sent. Your tutor will confirm shortly.');
      setForm({ tutor_email: '', subject: 'Mathematics', date: '', time: '14:00', duration_hours: '1', message: '', is_intro: false });
      setShowForm(false);
      await fetchBookingDashboardData();
    } catch (err) {
      toast.error(err.message || 'Could not send your booking. Please retry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelBooking = id => { setCancelId(id); setCancelMessage(''); };
  const confirmCancellation = async () => {
    setCancelling(true);
    try {
      const result = await cancelBooking(cancelId, cancelMessage);
      toast.success(result.refund_eligibility === 'full_booking_refund' ? 'Cancelled. A paid booking refund is eligible; settlement is separate.' : 'Cancelled. Any paid refund will be reviewed under the policy and applicable law.');
      if (result.email.status !== 'accepted') toast.info('The tutor has an in-app notice. Email is queued and needs delivery attention.');
      setCancelId(null);
      await fetchBookingDashboardData();
    } catch (err) { toast.error(err.message || 'Could not cancel.'); }
    finally { setCancelling(false); }
  };
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-2 select-none">
        <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Scheduler Matrix...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 font-sans select-none antialiased">
      <Dialog open={Boolean(cancelId)} onOpenChange={open => { if (!open && !cancelling) setCancelId(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Cancel your tutoring booking</DialogTitle></DialogHeader>
          <p className="text-sm">A paid booking is eligible for a full booking-fee refund when cancelled at least 24 hours before the session (South Africa time). Later cancellations require review, including your statutory rights. This does not refund a subscription.</p>
          <Label htmlFor="cancellation-message">Message to your tutor</Label>
          <Textarea id="cancellation-message" value={cancelMessage} onChange={e => setCancelMessage(e.target.value)} maxLength={2000} placeholder="Tell the tutor you are cancelling so they can rearrange their day." />
          <p className="text-xs">Your written message will be recorded and shared with the tutor. Minimum 10 characters.</p>
          <Button onClick={confirmCancellation} disabled={cancelling || cancelMessage.trim().length < 10}>{cancelling ? 'Cancelling…' : 'Confirm cancellation and notify tutor'}</Button>
        </DialogContent>
      </Dialog>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">

        {/* Dashboard Title Header Block */}
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">My Lesson Registrations</h1>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Book and manage single-session CAPS support structures</p>
          </div>
          <Button type="button" onClick={() => setShowForm(!showForm)} className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md gap-1.5 rounded-xl">
            <Plus className="w-4 h-4" /> Schedule New Session
          </Button>
        </div>

        {/* Booking Creation Accordion Form Panel Wrapper */}
        {showForm && (
          <Card className="border-slate-200 shadow-xl bg-white overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
              <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" /> Request a tutoring session
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Tutor Dropdown Node */}
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tutor *</Label>
                  <Select value={form.tutor_email} onValueChange={v => setForm({ ...form, tutor_email: v, subject: tutors.find(t => t.user_email === v)?.subjects?.[0] || '', is_intro: false, duration_hours: '1' })}>
                    <SelectTrigger className="text-xs h-8 bg-white border-slate-200">
                      <SelectValue placeholder="Select a verified tutor..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {tutors.map(t => (
                        <SelectItem key={t.id} value={t.user_email} className="text-xs font-medium">
                          {t.full_name} ({rateLabel(tutorRate(t))})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTutor && (
                    <p className="text-[10px] text-slate-400 font-semibold leading-none pl-0.5 mt-1.5">
                      ✓ Subjects: {selectedTutor.subjects?.join(', ')}
                    </p>
                  )}
                </div>

                {/* Subject Option Node */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Curriculum Subject *</Label>
                  <Select value={form.subject} onValueChange={v => setForm({ ...form, subject: v })}>
                    <SelectTrigger className="text-xs h-8 bg-white border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {(selectedTutor?.subjects || SUBJECT_OPTIONS).map(s => (
                        <SelectItem key={s} value={s} className="text-xs font-medium">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration Node */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Session Interval</Label>
                  <Select disabled={form.is_intro} value={form.duration_hours} onValueChange={v => setForm({ ...form, duration_hours: v })}>
                    <SelectTrigger className="text-xs h-8 bg-white border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {(form.is_intro ? ['0.5'] : ['0.5', '1', '1.5', '2', '3', '4']).map(h => (
                        <SelectItem key={h} value={h} className="text-xs font-medium">
                          {h} Hour{parseFloat(h) !== 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Node */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Session Date *</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="text-xs h-8 bg-white border-slate-200 cursor-pointer"
                  />
                </div>

                {/* Time Node */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Start Time</Label>
                  <Input
                    type="time"
                    value={form.time}
                    onChange={e => setForm({ ...form, time: e.target.value })}
                    className="text-xs h-8 bg-white border-slate-200 cursor-pointer"
                  />
                </div>

                {/* Message Node */}
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Topics / Notes</Label>
                  <Input
                    placeholder="Specify topics needing attention, e.g., Grade 12 Electrostatics exam problems..."
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    className="text-xs h-8 bg-white border-slate-200"
                  />
                </div>
              </div>

              {selectedTutor?.offers_free_intro && <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
                <input type="checkbox" className="mt-1" checked={form.is_intro} onChange={e => setForm(f => ({...f, is_intro: e.target.checked, duration_hours: e.target.checked ? '0.5' : '1'}))} />
                <span>Free 30-minute introduction<span className="block text-xs text-muted-foreground">One per learner and tutor. Eligibility is checked when you submit.</span></span>
              </label>}
              <p className="text-xs text-muted-foreground">Session times use South African time. Prices and availability are checked when you submit.</p>
              {selectedTutor && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700">Estimated cost:</span>
                  <span className="text-sm font-black text-blue-800">{estimatedCost === null ? 'Rate not set' : estimatedCost === 0 ? 'Free' : `R${estimatedCost.toFixed(2)}`}</span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  className="text-xs font-semibold text-slate-400 h-8"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="button"
                  onClick={handleCreateBooking}
                  disabled={isSaving || !selectedTutor || estimatedCost === null || !form.date || !form.subject}
                  className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm gap-1.5 rounded-xl"
                >
                  {isSaving ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                  ) : (
                    'Request Booking'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bookings Display Stack Panel Container */}
        {bookings.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="text-center py-16">
              <Calendar className="w-14 h-14 text-slate-300 mx-auto mb-4" />
              <p className="font-bold text-slate-600 text-base">No active lesson reservations</p>
              <p className="text-xs text-slate-400 mt-1">Discover verified educators and schedule a session</p>
              <Button onClick={() => setShowForm(true)} className="mt-4 h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm gap-1.5 rounded-xl">
                <Plus className="w-3.5 h-3.5" /> Find an Instructor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => {
              const cleanTime = b.time?.slice(0, 5) || b.time;
              return (
                <Card key={b.id} className="border-slate-200 hover:shadow-md transition-shadow bg-white">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                        {b.tutor_name?.[0] || 'T'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-bold text-sm text-slate-800">{b.tutor_name}</p>
                          <Badge className={`text-[10px] font-bold border ${STATUS_STYLES[b.status] || 'bg-slate-100 text-slate-600'}`}>
                            {b.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{b.subject}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.date}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{cleanTime} · {b.duration_hours}h</span>
                          {b.is_intro && <Badge variant="outline">Free introduction</Badge>}
                          {b.amount === 0 && !b.is_intro && <span>Free session</span>}
                          {b.amount > 0 && <span className="flex items-center gap-1 text-blue-600 font-bold">R{b.amount}</span>}
                        </div>
                        {b.message && <p className="text-xs text-slate-400 mt-1 italic">"{b.message}"</p>}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {b.status === 'confirmed' && b.session_link && (
                          <a href={b.session_link} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" className="text-xs gap-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white">
                              <ExternalLink className="w-3.5 h-3.5" /> Join Session
                            </Button>
                          </a>
                        )}
                        {b.status === 'completed' && (
                          <Button size="sm" variant="outline" className="text-xs gap-1 h-8" onClick={() => setReviewTarget(b)}>
                            <Star className="w-3.5 h-3.5" /> Review
                          </Button>
                        )}
                        {(b.status === 'pending' || b.status === 'confirmed') && (
                          <Button size="sm" variant="outline" className="text-xs text-red-600 border-red-200 hover:bg-red-50 h-8 gap-1" onClick={() => handleCancelBooking(b.id)}>
                            <XCircle className="w-3.5 h-3.5" /> Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Sub-modal injection point */}
      {reviewTarget && (
        <TutorReviewModal
          booking={reviewTarget}
          user={user}
          onClose={() => setReviewTarget(null)}
          onReviewed={fetchBookingDashboardData}
        />
      )}
    </div>
  );
}
