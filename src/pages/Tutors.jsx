import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { SUBJECTS } from '@/lib/subjects';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Star, CheckCircle, Mail, CalendarDays, Radio, MessageCircle, User } from 'lucide-react';
import BookingModal from '@/components/tutor/BookingModal';
import LiveTutorChat from '@/components/tutor/LiveTutorChat';
import TutorProfileModal from '@/components/tutor/TutorProfileModal';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';

export default function Tutors() {
  const { user } = useOutletContext() || {};
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bookingTutor, setBookingTutor] = useState(null);
  const [chatTutor, setChatTutor] = useState(null);
  const [profileTutor, setProfileTutor] = useState(null);

  useEffect(() => {
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('is_verified', true)
        .order('rating', { ascending: false });
      
      if (error) throw error;
      setTutors(data || []);
    } catch (error) {
      console.error('Error fetching tutors:', error);
      toast.error('Failed to load tutors');
    } finally {
      setLoading(false);
    }
  };

  const filtered = tutors.filter((t) =>
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.qualifications?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">SACE Verified</Badge>
          <h1 className="font-playfair text-4xl font-bold text-foreground mb-3">Find a Tutor</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Connect with qualified, SACE-verified tutors specialising in CAPS subjects for Grades 10–12.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto mb-10">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tutor cards */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map(i => <div key={i} className="h-52 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <div className="text-6xl mb-4">👨‍🏫</div>
            <p className="text-xl font-semibold mb-2">No tutors found</p>
            <p className="text-muted-foreground">
              {tutors.length === 0
                ? 'Tutors will appear here once they register. Are you a tutor? Sign up now!'
                : 'Try adjusting your search.'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((tutor) => (
              <div key={tutor.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                    {tutor.avatar_url ? (
                      <img src={tutor.avatar_url} alt={tutor.full_name} className="w-full h-full rounded-2xl object-cover" />
                    ) : (
                      tutor.full_name?.[0]?.toUpperCase() || 'T'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-playfair font-bold text-foreground">{tutor.full_name}</p>
                      {tutor.is_verified && (
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                    {tutor.is_verified && (
                      <Badge className="bg-green-100 text-green-700 border-green-200 text-xs mt-0.5">SACE Verified</Badge>
                    )}
                  </div>
                </div>

                {tutor.bio && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{tutor.bio}</p>
                )}
                {tutor.qualifications && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                    🎓 {tutor.qualifications}
                  </p>
                )}

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {tutor.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {Number(tutor.rating).toFixed(1)}
                      </span>
                    )}
                    {tutor.hourly_rate && (
                      <span>R{tutor.hourly_rate}/hr</span>
                    )}
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