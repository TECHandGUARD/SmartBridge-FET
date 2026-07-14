// src/pages/Bookings.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, BookOpen, Plus, Loader2, Star, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { SUBJECTS } from '@/lib/subjects';
import { toast } from 'sonner';
import TutorReviewModal from '@/components/student/TutorReviewModal';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION (All adjustable via .env)
// ============================================================

const CONFIG = {
  // Booking defaults
  DEFAULT_TIME: import.meta.env.VITE_BOOKING_DEFAULT_TIME || '09:00',
  DEFAULT_DURATION: Number(import.meta.env.VITE_BOOKING_DEFAULT_DURATION) || 1,
  MIN_BOOKING_HOURS: Number(import.meta.env.VITE_BOOKING_MIN_HOURS) || 1,
  MAX_BOOKING_HOURS: Number(import.meta.env.VITE_BOOKING_MAX_HOURS) || 3,
  BOOKING_HOURS_STEP: Number(import.meta.env.VITE_BOOKING_HOURS_STEP) || 0.5,
  
  // Status styles
  STATUS_STYLES: {
    pending: import.meta.env.VITE_STATUS_PENDING_STYLE || 'bg-amber-100 text-amber-700 border-amber-200',
    confirmed: import.meta.env.VITE_STATUS_CONFIRMED_STYLE || 'bg-green-100 text-green-700 border-green-200',
    cancelled: import.meta.env.VITE_STATUS_CANCELLED_STYLE || 'bg-red-100 text-red-700 border-red-200',
    completed: import.meta.env.VITE_STATUS_COMPLETED_STYLE || 'bg-blue-100 text-blue-700 border-blue-200',
  },
  
  // Toast messages
  MESSAGES: {
    BOOKING_SUCCESS: import.meta.env.VITE_BOOKING_SUCCESS_MSG || 'Booking request sent! The tutor will confirm shortly.',
    BOOKING_FAILED: import.meta.env.VITE_BOOKING_FAILED_MSG || 'Failed to create booking. Please try again.',
    CANCEL_SUCCESS: import.meta.env.VITE_CANCEL_SUCCESS_MSG || 'Booking cancelled.',
    CANCEL_FAILED: import.meta.env.VITE_CANCEL_FAILED_MSG || 'Failed to cancel booking.',
    FILL_REQUIRED: import.meta.env.VITE_FILL_REQUIRED_MSG || 'Please fill in all required fields.',
    NO_TUTORS: import.meta.env.VITE_NO_TUTORS_MSG || 'No verified tutors available. Please check back later.',
  },
  
  // Feature flags
  ENABLE_REVIEWS: import.meta.env.VITE_ENABLE_TUTOR_REVIEWS !== 'false',
  ENABLE_SESSION_LINKS: import.meta.env.VITE_ENABLE_SESSION_LINKS !== 'false',
  ENABLE_BOOKING_CANCELLATION: import.meta.env.VITE_ENABLE_BOOKING_CANCELLATION !== 'false',
  
  // Pagination
  TUTORS_LIMIT: Number(import.meta.env.VITE_TUTORS_DISPLAY_LIMIT) || 30,
  BOOKINGS_LIMIT: Number(import.meta.env.VITE_BOOKINGS_DISPLAY_LIMIT) || 50,
};

// ============================================================
// Component
// ============================================================

export default function Bookings() {
  const { user } = useOutletContext() || {};
  const [bookings, setBookings] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState(null);
  
  const [form, setForm] = useState({
    tutor_email: '',
    subject: '',
    date: '',
    time: CONFIG.DEFAULT_TIME,
    duration_hours: CONFIG.DEFAULT_DURATION,
    message: ''
  });

  // Generate booking reference
  const generateBookingRef = () => {
    const prefix = import.meta.env.VITE_BOOKING_REF_PREFIX || 'BK';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  // ============================================================
  // Data Fetching
  // ============================================================

  useEffect(() => {
    if (!user?.email) return;
    loadData();

    const channel = supabase
      .channel('bookings-changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tutor_bookings',
          filter: `student_email=eq.${user.email}`
        },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('student_email', user.email)
        .order('created_at', { ascending: false })
        .limit(CONFIG.BOOKINGS_LIMIT);

      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);

      const { data: tutorsData, error: tutorsError } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('is_verified', true)
        .order('rating', { ascending: false })
        .limit(CONFIG.TUTORS_LIMIT);

      if (tutorsError) throw tutorsError;
      setTutors(tutorsData || []);

    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error(CONFIG.MESSAGES.BOOKING_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const selectedTutor = tutors.find(t => t.user_email === form.tutor_email);

  // ============================================================
  // Handlers
  // ============================================================

  const handleBook = async () => {
    if (!form.tutor_email || !form.subject || !form.date) {
      toast.error(CONFIG.MESSAGES.FILL_REQUIRED);
      return;
    }

    setSaving(true);
    try {
      const tutor = tutors.find(t => t.user_email === form.tutor_email);
      const amount = (tutor?.hourly_rate || 0) * form.duration_hours;

      const { data, error } = await supabase
        .from('tutor_bookings')
        .insert({
          student_email: user.email,
          student_name: user.full_name || user.email,
          tutor_email: form.tutor_email,
          tutor_name: tutor?.full_name || '',
          subject: form.subject,
          date: form.date,
          time: form.time,
          duration_hours: form.duration_hours,
          message: form.message || null,
          amount: amount,
          status: 'pending',
          booking_reference: generateBookingRef()
        })
        .select()
        .single();

      if (error) throw error;

      setBookings(prev => [data, ...prev]);
      setForm({ tutor_email: '', subject: '', date: '', time: CONFIG.DEFAULT_TIME, duration_hours: CONFIG.DEFAULT_DURATION, message: '' });
      setShowForm(false);
      toast.success(CONFIG.MESSAGES.BOOKING_SUCCESS);
      
      await supabase
        .from('activity_log')
        .insert({
          event_type: 'booking_made',
          user_email: user.email,
          description: `Student ${user.email} booked ${tutor?.full_name || 'tutor'} for ${form.subject} on ${form.date}`
        });

    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(CONFIG.MESSAGES.BOOKING_FAILED);
    } finally {
      setSaving(false);
    }
  };

  const cancelBooking = async (id) => {
    if (!CONFIG.ENABLE_BOOKING_CANCELLATION) {
      toast.warning('Booking cancellation is currently disabled.');
      return;
    }

    try {
      const { error } = await supabase
        .from('tutor_bookings')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      setBookings(prev => prev.map(b => 
        b.id === id ? { ...b, status: 'cancelled' } : b
      ));
      toast.success(CONFIG.MESSAGES.CANCEL_SUCCESS);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error(CONFIG.MESSAGES.CANCEL_FAILED);
    }
  };

  // Generate duration options dynamically
  const durationOptions = [];
  for (let h = CONFIG.MIN_BOOKING_HOURS; h <= CONFIG.MAX_BOOKING_HOURS; h += CONFIG.BOOKING_HOURS_STEP) {
    durationOptions.push(h);
  }

  // ============================================================
  // Loading State
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ============================================================
  // Access Control
  // ============================================================

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to manage bookings.</p>
      </div>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-playfair text-3xl font-bold">My Bookings</h1>
            <p className="text-muted-foreground mt-1">Book and manage your tutor sessions.</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-primary gap-2">
            <Plus className="w-4 h-4" /> Book a Tutor
          </Button>
        </div>

        {/* Booking Form */}
        {showForm && (
          <Card className="mb-6 border-primary/20 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="font-playfair text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" /> New Booking Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Tutor Selection */}
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Tutor *</Label>
                  <Select value={form.tutor_email} onValueChange={v => setForm({ ...form, tutor_email: v })}>
                    <SelectTrigger><SelectValue placeholder="Select a tutor..." /></SelectTrigger>
                    <SelectContent>
                      {tutors.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">{CONFIG.MESSAGES.NO_TUTORS}</div>
                      ) : (
                        tutors.map(t => (
                          <SelectItem key={t.id} value={t.user_email}>
                            {t.full_name} {t.hourly_rate ? `— R${t.hourly_rate}/hr` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedTutor && (
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      <span>{selectedTutor.subjects?.join(', ')} · {selectedTutor.qualifications}</span>
                    </div>
                  )}
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <Label>Subject *</Label>
                  <Select value={form.subject} onValueChange={v => setForm({ ...form, subject: v })}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration - dynamically generated */}
                <div className="space-y-1.5">
                  <Label>Duration</Label>
                  <Select value={String(form.duration_hours)} onValueChange={v => setForm({ ...form, duration_hours: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {durationOptions.map(h => (
                        <SelectItem key={h} value={String(h)}>
                          {h} hour{h !== 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <Label>Date *</Label>
                  <Input 
                    type="date" 
                    value={form.date} 
                    onChange={e => setForm({ ...form, date: e.target.value })} 
                    min={new Date().toISOString().split('T')[0]} 
                  />
                </div>

                {/* Time - softcoded default */}
                <div className="space-y-1.5">
                  <Label>Time</Label>
                  <Input 
                    type="time" 
                    value={form.time} 
                    onChange={e => setForm({ ...form, time: e.target.value })} 
                  />
                </div>

                {/* Message */}
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Message to tutor (optional)</Label>
                  <Input 
                    placeholder={import.meta.env.VITE_BOOKING_MESSAGE_PLACEHOLDER || 'e.g. Need help with calculus chapter 5...'} 
                    value={form.message} 
                    onChange={e => setForm({ ...form, message: e.target.value })} 
                  />
                </div>
              </div>

              {/* Cost Estimate */}
              {selectedTutor?.hourly_rate > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                  <p className="font-semibold">Estimated cost: <span className="text-primary">R{selectedTutor.hourly_rate * form.duration_hours}</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">R{selectedTutor.hourly_rate}/hr × {form.duration_hours} hr</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleBook} disabled={saving} className="bg-primary gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  {saving ? 'Sending...' : 'Send Booking Request'}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <Card className="border-border">
            <CardContent className="text-center py-16">
              <Calendar className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="font-playfair text-xl font-bold mb-1">No bookings yet</p>
              <p className="text-muted-foreground text-sm mb-4">Book a verified tutor for personalised 1-on-1 sessions.</p>
              <Button onClick={() => setShowForm(true)} className="bg-primary gap-2">
                <Plus className="w-4 h-4" /> Book Your First Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => (
              <Card key={b.id} className="border-border hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                      {b.tutor_name?.[0] || 'T'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-semibold">{b.tutor_name}</p>
                        <Badge className={`text-xs ${CONFIG.STATUS_STYLES[b.status] || 'bg-muted text-muted-foreground'}`}>
                          {b.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{b.subject}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.time} · {b.duration_hours}h</span>
                        {b.amount > 0 && <span className="flex items-center gap-1 text-primary font-medium">R{b.amount}</span>}
                      </div>
                      {b.message && <p className="text-xs text-muted-foreground mt-1 italic">"{b.message}"</p>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {CONFIG.ENABLE_SESSION_LINKS && b.status === 'confirmed' && b.session_link && (
                        <a href={b.session_link} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="text-xs gap-1 h-8 bg-green-600 hover:bg-green-700 text-white">
                            <ExternalLink className="w-3.5 h-3.5" /> Join Session
                          </Button>
                        </a>
                      )}
                      
                      {CONFIG.ENABLE_REVIEWS && b.status === 'completed' && (
                        <Button size="sm" variant="outline" className="text-xs gap-1 h-8" onClick={() => setReviewTarget(b)}>
                          <Star className="w-3.5 h-3.5" /> Review
                        </Button>
                      )}
                      
                      {CONFIG.ENABLE_BOOKING_CANCELLATION && (b.status === 'pending' || b.status === 'confirmed') && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs text-destructive border-destructive/30 h-8 gap-1" 
                          onClick={() => cancelBooking(b.id)}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewTarget && (
        <TutorReviewModal
          booking={reviewTarget}
          user={user}
          onClose={() => setReviewTarget(null)}
          onReviewed={() => {
            setReviewTarget(null);
            toast.success('Review submitted! Thank you.');
            loadData();
          }}
        />
      )}
    </div>
  );
}
