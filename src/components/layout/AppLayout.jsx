// src/components/layout/AppLayout.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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

// Optimized event hook with simple throttling/passive listeners
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    let timeoutId = null;
    const handler = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth < 768);
      }, 100); // Throttled to prevent UI stuttering
    };
    window.addEventListener('resize', handler, { passive: true });
    return () => {
      window.removeEventListener('resize', handler);
      clearTimeout(timeoutId);
    };
  }, []);
  return isMobile;
}

const pageVariants = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -16 },
};
const pageTransition = { duration: 0.2, ease: 'easeOut' };

// Separate Layout Tree component to keep DOM lifecycles stable
const StructuralTree = React.memo(function StructuralTree({ isMobile, location, user }) {
  if (isMobile) {
    return (
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
    );
  }

  return (
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
});

// ============================================================
// Main Component
// ============================================================
export default function AppLayout() {
  const { user, loading: authLoading, checkUser } = useAuth();
  const [tutorVerified, setTutorVerified] = useState(null);
  const [verifyingTutor, setVerifyingTutor] = useState(false);
  
  const isMobile = useIsMobile();
  const location = useLocation();

  // Primary Check: Derive Admin identity securely using stable fields
  const isAdmin = useMemo(() => {
    if (!user) return false;
    return user.role === 'admin' || CONFIG.ADMIN_EMAILS.includes(user.email);
  }, [user?.email, user?.role]);

  // Use stable primitives (user?.id, user?.email) to break object reference loops
  const userId = user?.id;
  const userEmail = user?.email;
  const userRole = user?.role;

  useEffect(() => {
    let active = true;

    async function verifyTutorCompliance() {
      if (!userId || isAdmin || !CONFIG.TUTOR_ROLES.includes(userRole)) {
        setTutorVerified(null);
        return;
      }

      setVerifyingTutor(true);
      try {
        const { data: profile, error: tutorError } = await supabase
          .from('tutor_profiles')
          .select('is_verified')
          .eq('user_email', userEmail)
          .maybeSingle();
        
        if (!active) return; // Discard state mutations if component unmounted or changed

        if (!tutorError && profile) {
          setTutorVerified(profile.is_verified === true);
        } else {
          setTutorVerified(false);
        }
      } catch (err) {
        console.error('Tutor validation runtime error:', err);
        if (active) setTutorVerified(false);
      } finally {
        if (active) setVerifyingTutor(false);
      }
    }

    verifyTutorCompliance();

    return () => {
      active = false; // Cancels outstanding network state updates
    };
  }, [userId, userEmail, userRole, isAdmin]);

  const handleOnboardingComplete = async () => {
    if (checkUser) {
      await checkUser();
    }
  };

  // Block rendering to prevent component layout flashing
  if (authLoading || verifyingTutor) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // 1. Guest view tree
  if (!user) {
    return <StructuralTree isMobile={isMobile} location={location} user={null} />;
  }

  // 2. Admin superpowers bypass
  if (isAdmin) {
    return <StructuralTree isMobile={isMobile} location={location} user={user} />;
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
  return <StructuralTree isMobile={isMobile} location={location} user={user} />;
}
