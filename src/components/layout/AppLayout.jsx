import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileHeader from './MobileHeader';
import MobileBottomTabs from './MobileBottomTabs';
import Onboarding from '@/pages/Onboarding';
import TutorPendingScreen from '@/components/onboarding/TutorPendingScreen';

const TUTOR_ROLES = ['sace_tutor', 'student_tutor', 'tutor_pending'];

function getDashboardPath(role) {
  if (role === 'admin') return '/admin';
  if (TUTOR_ROLES.includes(role)) return '/tutor-dashboard';
  if (role === 'parent') return '/parent-dashboard';
  return '/student-dashboard';
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

const pageVariants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -24 },
};
const pageTransition = { duration: 0.22, ease: 'easeInOut' };

export default function AppLayout() {
  const [user, setUser] = useState(null);
  const [tutorVerified, setTutorVerified] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      // Get current user from Supabase Auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        setUser(null);
        setTutorVerified(null);
        return;
      }

      // Get user profile from user_profiles table
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', authUser.email)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile fetch error:', profileError);
      }

      const userData = {
        ...authUser,
        ...profile,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name,
        role: profile?.role || 'user',
        onboarding_complete: profile?.onboarding_complete || false,
      };
      
      setUser(userData);

      if (userData && TUTOR_ROLES.includes(userData.role)) {
        // Check tutor profile verification
        const { data: profiles, error: tutorError } = await supabase
          .from('tutor_profiles')
          .select('*')
          .eq('user_email', userData.email);
        
        if (!tutorError) {
          const isProfileVerified = profiles?.length > 0 ? profiles[0].is_verified === true : false;
          const isRoleCorrect = userData.role !== 'tutor_pending' && userData.role !== 'user';
          setTutorVerified(isProfileVerified || isRoleCorrect);
        } else {
          setTutorVerified(null);
        }
      } else {
        setTutorVerified(null);
      }
    } catch (error) {
      console.error('Fetch user failed:', error);
      setUser(null);
      setTutorVerified(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const handleOnboardingComplete = async () => {
    setLoading(true);
    const maxAttempts = 10;
    let attempts = 0;
    let updatedUser = null;
    
    while (attempts < maxAttempts && !updatedUser) {
      await new Promise(r => setTimeout(r, 500));
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('email', authUser.email)
          .single();
        
        if (profile && profile.role !== 'user') {
          updatedUser = { ...authUser, ...profile };
        }
      }
      attempts++;
    }
    
    setUser(updatedUser);
    const role = updatedUser?.role;

    if (TUTOR_ROLES.includes(role)) {
      const { data: profiles } = await supabase
        .from('tutor_profiles')
        .select('*')
        .eq('user_email', updatedUser.email);
      const isProfileVerified = profiles?.length > 0 ? profiles[0].is_verified === true : false;
      setTutorVerified(isProfileVerified);
    } else {
      setTutorVerified(null);
      navigate(getDashboardPath(role), { replace: true });
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!user) {
    return isMobile ? (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileHeader />
        <main className="flex-1 pt-14 pb-16">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
              <Outlet context={{ user }} />
            </motion.div>
          </AnimatePresence>
        </main>
        <MobileBottomTabs user={user} />
      </div>
    ) : (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar user={user} />
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
              <Outlet context={{ user }} />
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    );
  }

  if (user.role === 'admin') {
    return isMobile ? (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileHeader />
        <main className="flex-1 pt-14 pb-16">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
              <Outlet context={{ user }} />
            </motion.div>
          </AnimatePresence>
        </main>
        <MobileBottomTabs user={user} />
      </div>
    ) : (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar user={user} />
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
              <Outlet context={{ user }} />
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    );
  }

  const shouldOnboard = user.role === 'user';
  if (shouldOnboard) {
    return <Onboarding user={user} onComplete={handleOnboardingComplete} />;
  }

  const isTutorRole = TUTOR_ROLES.includes(user.role);
  const isTutorPending = isTutorRole && tutorVerified === false;
  if (isTutorPending) {
    return <TutorPendingScreen user={user} onRefresh={fetchUser} />;
  }

  return isMobile ? (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader />
      <main className="flex-1 pt-14 pb-16">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <Outlet context={{ user }} />
          </motion.div>
        </AnimatePresence>
      </main>
      <MobileBottomTabs user={user} />
    </div>
  ) : (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar user={user} />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <Outlet context={{ user }} />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
