import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Star, CheckCircle, Mail, CalendarDays, Radio, MessageCircle, User, ShieldCheck, Video, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import BookingModal from '@/components/tutor/BookingModal';
import LiveTutorChat from '@/components/tutor/LiveTutorChat';
import TutorProfileModal from '@/components/tutor/TutorProfileModal';

async function fetchTutorWithRatings(tutor) {
  try {
    const { data: reviews, error } = await supabase
      .from('tutor_reviews')
      .select('rating')
      .eq('tutor_email', tutor.user_email);

    if (error) throw error;

    const avgRating = reviews && reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : null;
    return { ...tutor, rating: avgRating, total_reviews: reviews?.length || 0 };
  } catch (error) {
    console.error('Failed to fetch reviews for', tutor.user_email, error);
    return { ...tutor, rating: null, total_reviews: 0 };
  }
}

export default function Tutors() {
  const { user } = useOutletContext() || {};
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [bookingTutor, setBookingTutor] = useState(null);
  const [chatTutor, setChatTutor] = useState(null);
  const [profileTutor, setProfileTutor] = useState(null);
  const [tutorUsers, setTutorUsers] = useState([]);

  const loadLiveSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('email, session_platform')
        .eq('in_session', true);

      if (error) throw error;
      setTutorUsers(data || []);
    } catch (error) {
      console.error('Failed to load live sessions:', error);
    }
  }, []);

  const loadTutors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load verified tutors
      const { data: tutorsList, error: tutorsError } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('is_verified', true)
        .order('rating', { ascending: false });

      if (tutorsError) throw tutorsError;

      // Fetch ratings for each tutor
      const tutorsWithRatings = await Promise.all(
        (tutorsList || []).map(tutor => fetchTutorWithRatings(tutor))
      );
      
      const sortedTutors = tutorsWithRatings.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      setTutors(sortedTutors);
    } catch (error) {
      console.error('Failed to load tutors:', error);
      setError('Failed to load tutors. Please try again.');
      toast.error('Failed to load tutors');
      setTutors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTutors();
    loadLiveSessions();
  }, [loadTutors, loadLiveSessions]);

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filtered = tutors.filter((t) => 
    t.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
    t.subjects?.some((s) => s.toLowerCase().includes(debouncedSearch.toLowerCase()))
  );

  const inSessionEmails = new Set(tutorUsers.map(u => u.email));
  const sessionPlatforms = Object.fromEntries(tutorUsers.map(u => [u.email, u.session_platform]));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-red-500 font-medium mb-4">{error}</p>
          <Button onClick={loadTutors} variant="outline">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">Find Your Perfect Match</Badge>
          <h1 className="font-playfair text-4xl font-bold text-foreground mb-3">Find a Tutor</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Connect with qualified tutors. See their photo, watch their intro video, and choose who's right for you.</p>
        </div>

        <div className="relative max-w-md mx-auto mb-10">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or subject..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9" 
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <div className="text-6xl mb-4">👨‍🏫</div>
            <p className="text-xl font-semibold mb-2">No tutors found</p>
            <p className="text-muted-foreground">
              {tutors.length === 0 ? 'Tutors will appear here once they register.' : 'Try adjusting your search.'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((tutor) => (
              <div key={tutor.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-3 mb-3">
                  {/* Tutor Photo */}
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0 overflow-hidden">
                    {tutor.avatar_url ? (
                      <img src={tutor.avatar_url} alt={tutor.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-playfair font-bold text-foreground">{tutor.full_name}</p>
                    </div>
                    
                    {/* Verification Badge */}
                    {tutor.is_verified && (
                      tutor.sace_number ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs mt-0.5 gap-1">
                          <ShieldCheck className="w-3 h-3" /> SACE Verified
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs mt-0.5 gap-1">
                          <CheckCircle className="w-3 h-3" /> Admin Verified
                        </Badge>
                      )
                    )}
                    
                    {inSessionEmails.has(tutor.user_email) && (
                      <Badge className="bg-red-100 text-red-700 border-red-200 text-xs gap-1 animate-pulse mt-0.5">
                        <Radio className="w-3 h-3" /> Live in {sessionPlatforms[tutor.user_email]}
                      </Badge>
                    )}
                  </div>
                </div>

                {tutor.bio && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{tutor.bio}</p>}
                {tutor.qualifications && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                    🎓 {typeof tutor.qualifications === 'string' ? tutor.qualifications : tutor.qualifications?.join(', ')}
                  </p>
                )}

                {tutor.subjects?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {tutor.subjects.slice(0, 3).map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                    {tutor.subjects.length > 3 && (
                      <Badge variant="secondary" className="text-xs">+{tutor.subjects.length - 3} more</Badge>
                    )}
                  </div>
                )}

                {/* Video indicator */}
                {tutor.video_url && (
                  <div className="flex items-center gap-1 mb-2">
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Video className="w-3 h-3" /> Has intro video
                    </Badge>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {tutor.rating && tutor.rating > 0 ? (
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {tutor.rating.toFixed(1)} ({tutor.total_reviews})
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="w-3.5 h-3.5" />No reviews yet
                      </span>
                    )}
                    {tutor.hourly_rate && <span>R{tutor.hourly_rate}/hr</span>}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => setProfileTutor(tutor)}>
                      <User className="w-3 h-3" /> Profile
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => setChatTutor(tutor)}>
                      <MessageCircle className="w-3 h-3" /> Chat
                    </Button>
                    <Button size="sm" className="gap-1 text-xs h-8 bg-primary" onClick={() => setBookingTutor(tutor)}>
                      <CalendarDays className="w-3 h-3" /> Book
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TutorProfileModal 
        tutor={profileTutor} 
        user={user} 
        open={!!profileTutor} 
        onClose={() => setProfileTutor(null)} 
        onBook={(t) => setBookingTutor(t)} 
        onChat={(t) => setChatTutor(t)} 
      />
      {bookingTutor && (
        <BookingModal 
          tutor={bookingTutor} 
          user={user} 
          open={!!bookingTutor} 
          onClose={() => setBookingTutor(null)} 
        />
      )}
      {chatTutor && (
        <LiveTutorChat 
          user={user} 
          tutorEmail={chatTutor.user_email} 
          tutorName={chatTutor.full_name} 
          onClose={() => setChatTutor(null)} 
        />
      )}
    </div>
  );
}