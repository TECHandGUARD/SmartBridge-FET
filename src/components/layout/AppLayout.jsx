import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import Navbar from './Navbar';
import Footer from './Footer';
import Onboarding from '@/pages/Onboarding';
import TutorPendingScreen from '@/components/onboarding/TutorPendingScreen';

const TUTOR_ROLES = ['sace_tutor', 'student_tutor', 'tutor_pending'];

function getDashboardPath(role) {
  if (role === 'admin') return '/admin';
  if (TUTOR_ROLES.includes(role)) return '/tutor-dashboard';
  if (role === 'parent') return '/parent-dashboard';
  return '/student-dashboard';
}

export default function AppLayout() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [tutorVerified, setTutorVerified] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserAndProfile = async () => {
    setLoading(true);
    try {
      // Get current session from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session) {
        setUser(null);
        setUserProfile(null);
        setTutorVerified(null);
        setLoading(false);
        return;
      }

      const supabaseUser = session.user;
      setUser(supabaseUser);

      // Fetch user profile from user_profiles table
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', supabaseUser.email)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      setUserProfile(profile);

      // Check tutor verification for tutor roles
      if (profile && TUTOR_ROLES.includes(profile.role) && profile.onboarding_complete) {
        const { data: tutorData, error: tutorError } = await supabase
          .from('tutor_profiles')
          .select('is_verified')
          .eq('user_email', supabaseUser.email)
          .maybeSingle();

        if (!tutorError && tutorData) {
          setTutorVerified(tutorData.is_verified === true);
        } else {
          setTutorVerified(false);
        }
      } else {
        setTutorVerified(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
      setUserProfile(null);
      setTutorVerified(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndProfile();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserAndProfile();
      } else {
        setUser(null);
        setUserProfile(null);
        setTutorVerified(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleOnboardingComplete = async () => {
    // Refresh user data after onboarding
    await fetchUserAndProfile();
    
    const role = userProfile?.role;
    if (role && TUTOR_ROLES.includes(role)) {
      // Tutors go to pending screen
      setLoading(false);
    } else if (role) {
      setLoading(false);
      navigate(getDashboardPath(role), { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // No user logged in - redirect to login
  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  // Needs onboarding: logged in, no role set yet, not admin
  const needsOnboarding = userProfile && !userProfile.onboarding_complete && userProfile.role !== 'admin' && !TUTOR_ROLES.includes(userProfile?.role);
  
  if (needsOnboarding) {
    return <Onboarding user={user} userProfile={userProfile} onComplete={handleOnboardingComplete} />;
  }

  // tutor_pending = newly registered tutor awaiting admin verification
  const isTutorRole = userProfile && TUTOR_ROLES.includes(userProfile.role);
  const isTutorPending = isTutorRole && userProfile?.onboarding_complete && tutorVerified === false;
  
  if (isTutorPending) {
    return <TutorPendingScreen user={user} userProfile={userProfile} onRefresh={fetchUserAndProfile} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar user={user} userProfile={userProfile} />
      <main className="flex-1">
        <Outlet context={{ user, userProfile }} />
      </main>
      <Footer />
    </div>
  );
}