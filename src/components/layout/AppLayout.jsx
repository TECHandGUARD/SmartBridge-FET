// src/components/layout/AppLayout.jsx
import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext'; 
import { supabase } from '@/lib/supabaseClient';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileHeader from './MobileHeader';
import MobileBottomTabs from './MobileBottomTabs';
import Onboarding from '@/pages/Onboarding';
import TutorPendingScreen from '@/pages/TutorPendingScreen';

// ============================================================
// CONFIGURATION LAYER
// ============================================================
const CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',
  ADMIN_EMAILS: (import.meta.env.VITE_ADMIN_EMAILS || 'aneleqamata95@gmail.com,aneleq@techandguard.co.za')
    .split(',')
    .map(email => email.trim())
    .filter(Boolean),

  TUTOR_ROLES: ['sace_tutor', 'student_tutor', 'tutor_pending'],
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// ============================================================
// Animation Config (Smooth UX Experience)
// ============================================================
const pageVariants = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -16 },
};
const pageTransition = { duration: 0.2, ease: 'easeOut' };

// ============================================================
// Main Component
// ============================================================
export default function AppLayout() {
  // Consume data entirely from global AuthContext
  const { user, loading: authLoading, checkUser } = useAuth();
  const [tutorVerified, setTutorVerified] = useState(null);
  const [verifyingTutor, setVerifyingTutor] = useState(false);
  
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine if user has hardcoded Admin privilege
  const isAdmin = user && (user.role === 'admin' || CONFIG.ADMIN_EMAILS.includes(user.email));

  // Verify tutor documents in background without overwriting the master user session
  useEffect(() => {
    async function verifyTutorCompliance() {
      if (!user || isAdmin || !CONFIG.TUTOR_ROLES.includes(user.role)) {
        setTutorVerified(null);
        return;
      }

      setVerifyingTutor(true);
      try {
        const { data: profile, error: tutorError } = await supabase
          .from('tutor_profiles')
          .select('is_verified')
          .eq('user_email', user.email)
          .maybeSingle();
        
        if (!tutorError && profile) {
          setTutorVerified(profile.is_verified === true);
        } else {
          setTutorVerified(false);
        }
      } catch (err) {
        console.error('Tutor validation runtime error:', err);
        setTutorVerified(false);
      } finally {
        setVerifyingTutor(false);
      }
    }

    verifyTutorCompliance();
  }, [user, isAdmin]);

  const handleOnboardingComplete = async () => {
    if (checkUser) {
      await checkUser();
    }
  };

  // Block rendering while authenticating to prevent component layout flashing
  if (authLoading || verifyingTutor) return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  // 1. Guest view tree
  if (!user) {
    return renderStructuralTree(isMobile, location, null);
  }

  // 2. Admin superpowers bypass
  if (isAdmin) {
    return renderStructuralTree(isMobile, location, user);
  }

  // 3. User onboarding funnel check
  if (user.role === 'user' || !user.onboarding_complete) {
    return <Onboarding user={user} onComplete={handleOnboardingComplete} />;
  }

  // 4. Tutor verification hold check
  if (CONFIG.TUTOR_ROLES.includes(user.role) && tutorVerified === false) {
    return <TutorPendingScreen user={user} onRefresh={handleOnboardingComplete} />;
  }

  // 5. Normal verified application layout view
  return renderStructuralTree(isMobile, location, user);
}

// Helper structural renderer to maintain layout clean code separation
function renderStructuralTree(isMobile, location, user) {
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
