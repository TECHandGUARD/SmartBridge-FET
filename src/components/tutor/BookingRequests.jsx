import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Clock, CheckCircle, XCircle, User, BookOpen, ExternalLink, Search, Loader2, AlertCircle, DollarSign, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

const ATTENDANCE_STATUS = {
  attended: { label: 'Attended', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  no_show_student: { label: 'Student No-Show', color: 'bg-red-100 text-red-700', icon: XCircle },
  no_show_tutor: { label: 'Tutor No-Show', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  late: { label: 'Late', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
};

// Helper function to format datetime (without date-fns-tz)
const formatDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return 'Date TBD';
  try {
    const date = new Date(`${dateStr}T${timeStr}:00`);
    return format(date, 'EEEE, MMM d, yyyy · h:mm a');
  } catch (e) {
    return `${dateStr} at ${timeStr}`;
  }
};

// Calculate net earnings after platform fee
const getNetEarnings = (amount) => {
  if (!amount) return 0;
  const platformFee = 0.10; // 10%
  const vat = 0.15; // 15% VAT on fee
  const fee = amount * platformFee;
  const vatAmount = fee * vat;
  return amount - fee - vatAmount;
};

// Check if two bookings overlap with buffer
const hasOverlap = (booking1, booking2) => {
  const start1 = new Date(`${booking1.date}T${booking1.time}`);
  const end1 = new Date(start1.getTime() + (booking1.duration_hours * 60 * 60 * 1000));
  const start2 = new Date(`${booking2.date}T${booking2.time}`);
  const end2 = new Date(start2.getTime() + (booking2.duration_hours * 60 * 60 * 1000));
  
  // 15 minute buffer between sessions
  const buffer = 15 * 60 * 1000;
  return (start1 < end2 + buffer && end1 > start2 - buffer);
};

export default function BookingRequests({ user, onBookingUpdate }) {
  const [bookings, setBookings] = useState([]);
  const [tutorProfile, setTutorProfile] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookings, setSelectedBookings] = useState(new Set());
  const [rescheduleRequests, setRescheduleRequests] = useState({});

  const loadData = useCallback(async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Load bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('tutor_email', user.email)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (bookingsError) throw bookingsError;
      
      // Load tutor profile for session links
      const { data: profileData, error: profileError } = await supabase
        .from('tutor_profiles')
        .select('zoom_link, teams_link')
        .eq('user_email', user.email)
        .maybeSingle();
      
      if (profileError) throw profileError;
      
      setBookings(bookingsData || []);
      setTutorProfile(profileData);
      
      // Load reschedule requests
      const { data: rescheduleData } = await supabase
        .from('booking_reschedule_requests')
        .select('*')
        .eq('tutor_email', user.email)
        .eq('status', 'pending');
      
      if (rescheduleData) {
        const requestMap = {};
        rescheduleData.forEach(r => { requestMap[r.booking_id] = r; });
        setRescheduleRequests(requestMap);
      }
    } catch (err) {
      console.error('Error loading bookings:', err);
      setError('Failed to load booking requests');
      toast.error('Failed to load booking requests');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // Set up real-time subscription
  useEffect(() => {
    loadData();
    
    if (!user?.email) return;
    
    const channel = supabase
      .channel('tutor_booking_requests')
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
            setBookings(prev => [payload.new, ...prev]);
            toast.info(`New booking request from ${payload.new.student_email}`);
          } else if (payload.eventType === 'UPDATE') {
            setBookings(prev => prev.map(b => b.id === payload.new.id ? payload.new : b));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, loadData]);

  const sendEmailNotification = async (booking, action, customMessage = null) => {
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: booking.student_email,
          subject: action === 'confirmed' 
            ? `✅ Session Confirmed — ${booking.subject} with ${user.full_name}`
            : action === 'cancelled'
            ? `❌ Session Cancelled — ${booking.subject}`
            : `📝 Session Update — ${booking.subject}`,
          body: customMessage || (
            action === 'confirmed'
              ? `Hi,\n\nYour tutoring session has been confirmed!\n\n📚 Subject: ${booking.subject}\n📅 Date: ${formatDateTime(booking.date, booking.time)}\n⏱ Duration: ${booking.duration_hours}h\n\nYour tutor will share the session link before the session.\n\n— SmartBridge FET / Tech & GUARD Pty Ltd`
              : `Hi,\n\nYour tutoring session has been cancelled.\n\n📚 Subject: ${booking.subject}\n📅 Date: ${formatDateTime(booking.date, booking.time)}\n\nPlease book another time.\n\n— SmartBridge FET / Tech & GUARD Pty Ltd`
          ),
          from_name: 'SmartBridge FET'
        }
      });
      if (error) console.error('Email notification error:', error);
    } catch (err) {
      console.error('Failed to send email:', err);
    }
  };

  const checkOverlap = (newBooking) => {
    const otherBookings = bookings.filter(b => 
      b.id !== newBooking.id && 
      b.status === 'confirmed' && 
      b.date === newBooking.date
    );
    
    for (const existing of otherBookings) {
      if (hasOverlap(newBooking, existing)) {
        return existing;
      }
    }
    return null;
  };

  const accept = async (booking) => {
    setProcessing(booking.id);
    const sessionLink = tutorProfile?.zoom_link || tutorProfile?.teams_link || '';
    
    // Check for overlap with existing confirmed bookings
    const overlapping = checkOverlap(booking);
    if (overlapping) {
      toast.error(`This time overlaps with another session (${overlapping.time} - ${overlapping.subject})`);
      setProcessing(null);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('tutor_bookings')
        .update({ 
          status: 'confirmed', 
          session_link: sessionLink,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);
      
      if (error) throw error;
      
      setBookings(prev => prev.map(b => 
        b.id === booking.id ? { ...b, status: 'confirmed', session_link: sessionLink } : b
      ));
      
      await sendEmailNotification(booking, 'confirmed');
      toast.success('Booking confirmed! Student notified.');
      if (onBookingUpdate) onBookingUpdate();
    } catch (err) {
      console.error('Error accepting booking:', err);
      toast.error('Failed to accept booking');
    } finally {
      setProcessing(null);
    }
  };

  const decline = async (booking, reason = null) => {
    setProcessing(booking.id);
    
    try {
      const { error } = await supabase
        .from('tutor_bookings')
        .update({ 
          status: 'cancelled',
          cancellation_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);
      
      if (error) throw error;
      
      setBookings(prev => prev.map(b => 
        b.id === booking.id ? { ...b, status: 'cancelled', cancellation_reason: reason } : b
      ));
      
      const customMessage = reason 
        ? `Hi,\n\nYour tutoring session has been cancelled.\n\n📚 Subject: ${booking.subject}\n📅 Date: ${formatDateTime(booking.date, booking.time)}\n\nReason: ${reason}\n\nPlease book another time.\n\n— SmartBridge FET / Tech & GUARD Pty Ltd`
        : null;
      
      await sendEmailNotification(booking, 'cancelled', customMessage);
      toast.info('Booking declined.');
      if (onBookingUpdate) onBookingUpdate();
    } catch (err) {
      console.error('Error declining booking:', err);
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
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);
      
      if (error) throw error;
      
      setBookings(prev => prev.map(b => 
        b.id === booking.id ? { ...b, status: 'completed' } : b
      ));
      
      toast.success('Session marked as completed.');
      if (onBookingUpdate) onBookingUpdate();
    } catch (err) {
      console.error('Error completing session:', err);
      toast.error('Failed to mark session as completed');
    } finally {
      setProcessing(null);
    }
  };

  const markAttendance = async (booking, attendance) => {
    setProcessing(booking.id);
    
    try {
      const { error } = await supabase
        .from('tutor_bookings')
        .update({ 
          attendance_status: attendance,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);
      
      if (error) throw error;
      
      setBookings(prev => prev.map(b => 
        b.id === booking.id ? { ...b, attendance_status: attendance } : b
      ));
      
      toast.success(`Marked as ${ATTENDANCE_STATUS[attendance]?.label}`);
      if (onBookingUpdate) onBookingUpdate();
    } catch (err) {
      console.error('Error marking attendance:', err);
      toast.error('Failed to mark attendance');
    } finally {
      setProcessing(null);
    }
  };

  const batchAccept = async () => {
    const pendingSelected = Array.from(selectedBookings).filter(id => 
      bookings.find(b => b.id === id && b.status === 'pending')
    );
    
    for (const id of pendingSelected) {
      const booking = bookings.find(b => b.id === id);
      if (booking) await accept(booking);
    }
    
    setSelectedBookings(new Set());
    toast.success(`${pendingSelected.length} bookings accepted`);
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedBookings);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedBookings(newSet);
  };

  const filteredBookings = useMemo(() => {
    let filtered = bookings;
    
    if (filter !== 'all') {
      filtered = filtered.filter(b => b.status === filter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(b => 
        b.student_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.subject.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [bookings, filter, searchTerm]);

  const sessionLink = tutorProfile?.zoom_link || tutorProfile?.teams_link || null;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  // Placeholder functions for reschedule actions (to be implemented)
  const acceptReschedule = (booking, request) => {
    toast.info('Reschedule accepted (functionality to be implemented)');
  };

  const declineReschedule = (booking, request) => {
    toast.info('Reschedule declined (functionality to be implemented)');
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-playfair text-lg flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> Booking Requests
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
          <CardTitle className="font-playfair text-lg flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> Booking Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadData}>Retry</Button>
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
        
        {/* Filters */}
        <div className="flex gap-2 mt-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input 
              placeholder="Search student or subject..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No booking requests yet. Students will appear here when they book you.</p>
        ) : filteredBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No bookings match your filters.</p>
        ) : (
          <>
            {/* Batch Action Bar */}
            {selectedBookings.size > 0 && (
              <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-primary text-white rounded-lg px-4 py-2 shadow-lg flex gap-2 z-50">
                <span className="text-sm">{selectedBookings.size} selected</span>
                <Button size="sm" className="bg-white text-primary hover:bg-gray-100" onClick={batchAccept}>
                  Accept All
                </Button>
                <Button size="sm" variant="outline" className="border-white text-white hover:bg-white/20" onClick={() => setSelectedBookings(new Set())}>
                  Clear
                </Button>
              </div>
            )}
            
            <div className="space-y-3">
              {filteredBookings.map(b => {
                const isProcessing = processing === b.id;
                const isPast = new Date(b.date) < new Date();
                const isToday = new Date(b.date).toDateString() === new Date().toDateString();
                const hasRescheduleRequest = rescheduleRequests[b.id];
                const AttendanceIcon = ATTENDANCE_STATUS[b.attendance_status]?.icon || null;
                
                return (
                  <div key={b.id} className={`p-4 rounded-xl border ${
                    b.status === 'pending' ? 'border-amber-200 bg-amber-50/50' : 
                    b.status === 'confirmed' && isToday ? 'border-green-300 bg-green-50/50' :
                    'border-border bg-muted/30'
                  }`}>
                    <div className="flex items-start gap-3">
                      {/* Checkbox for batch actions */}
                      <input 
                        type="checkbox"
                        checked={selectedBookings.has(b.id)}
                        onChange={() => toggleSelect(b.id)}
                        className="mt-1 w-4 h-4 rounded border-gray-300"
                        disabled={b.status !== 'pending'}
                      />
                      
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">{b.student_email}</p>
                          <Badge className={`text-xs ${STATUS_STYLES[b.status]}`}>{b.status}</Badge>
                          {hasRescheduleRequest && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs">Reschedule requested</Badge>
                          )}
                          {isPast && b.status !== 'completed' && b.status !== 'cancelled' && (
                            <Badge className="bg-gray-100 text-gray-600 text-xs">Past</Badge>
                          )}
                          {isToday && b.status === 'confirmed' && (
                            <Badge className="bg-green-100 text-green-700 text-xs animate-pulse">Today</Badge>
                          )}
                          {b.attendance_status && AttendanceIcon && (
                            <Badge className={`text-xs ${ATTENDANCE_STATUS[b.attendance_status]?.color}`}>
                              <AttendanceIcon className="w-3 h-3 inline mr-0.5" />
                              {ATTENDANCE_STATUS[b.attendance_status]?.label}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{b.subject}</span>
                          <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{formatDateTime(b.date, b.time)}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.duration_hours}h</span>
                        </div>
                        
                        {b.amount > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium text-primary">R{b.amount}</span>
                            <span className="text-[10px] text-muted-foreground">
                              (net: R{getNetEarnings(b.amount).toFixed(0)})
                            </span>
                          </div>
                        )}
                        
                        {b.message && <p className="text-xs text-muted-foreground mt-1 italic">"{b.message}"</p>}
                        {b.cancellation_reason && (
                          <p className="text-xs text-red-600 mt-1">Cancelled: {b.cancellation_reason}</p>
                        )}
                        
                        {/* Reschedule request details */}
                        {hasRescheduleRequest && (
                          <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                            <p className="text-[10px] text-purple-700">
                              Student requests reschedule to: {formatDateTime(
                                hasRescheduleRequest.requested_date, 
                                hasRescheduleRequest.requested_time
                              )}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <Button size="sm" className="h-6 text-[10px] bg-purple-600" onClick={() => acceptReschedule(b, hasRescheduleRequest)}>
                                Accept
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => declineReschedule(b, hasRescheduleRequest)}>
                                Decline
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {/* Join Session Button */}
                        {b.status === 'confirmed' && sessionLink && (!isPast || isToday) && (
                          <a href={sessionLink} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" className="text-xs gap-1 h-8 bg-green-600 hover:bg-green-700 text-white">
                              <ExternalLink className="w-3.5 h-3.5" /> Join Session
                            </Button>
                          </a>
                        )}
                        
                        {/* Mark Complete */}
                        {b.status === 'confirmed' && isPast && (
                          <Button size="sm" variant="outline" className="text-xs gap-1 h-8" disabled={isProcessing} onClick={() => markComplete(b)}>
                            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            Complete
                          </Button>
                        )}
                        
                        {/* Attendance buttons for completed sessions */}
                        {b.status === 'completed' && !b.attendance_status && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => markAttendance(b, 'attended')}>
                              Attended
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs h-7 text-red-600" onClick={() => markAttendance(b, 'no_show_student')}>
                              No-Show
                            </Button>
                          </div>
                        )}
                        
                        {/* Pending actions */}
                        {b.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" className="text-xs gap-1 h-8 text-red-700 border-red-200 hover:bg-red-50" disabled={isProcessing} onClick={() => decline(b)}>
                              {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                              Decline
                            </Button>
                            <Button size="sm" className="text-xs gap-1 h-8 bg-green-600 hover:bg-green-700 text-white" disabled={isProcessing} onClick={() => accept(b)}>
                              {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              Accept
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Warning for pending sessions */}
                    {b.status === 'pending' && !isPast && (
                      <div className="mt-2 pt-2 border-t border-amber-200">
                        <p className="text-[10px] text-amber-600 flex items-center gap-1">
                          <Bell className="w-3 h-3" /> Respond within 24 hours to confirm this session.
                        </p>
                      </div>
                    )}
                    
                    {/* Reminder to complete attendance */}
                    {b.status === 'completed' && !b.attendance_status && (
                      <div className="mt-2 pt-2 border-t border-blue-200">
                        <p className="text-[10px] text-blue-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Please mark student attendance for this session.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
