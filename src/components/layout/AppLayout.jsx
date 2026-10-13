import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileHeader from './MobileHeader';
import MobileBottomTabs from './MobileBottomTabs';
import { useAuth } from '@/lib/AuthContext';
import { withTimeout } from '@/lib/auth-utils';
import TutorPendingScreen from '@/components/tutor/TutorPendingScreen';

import { TUTOR_ROLES } from '@/lib/navigation';

export default function AppLayout() {
  const { user, isLoadingAuth: loading, checkUser: fetchUser, isAdmin, signOut } = useAuth();
  const [tutorVerified, setTutorVerified] = useState(null);
  const [tutorError, setTutorError] = useState(false);
  const reducedMotion = useReducedMotion();
  const main = useRef(null);
  const location = useLocation();
  useEffect(() => {
    let cancelled = false;
    setTutorVerified(null); setTutorError(false);
    if (!user || isAdmin || !TUTOR_ROLES.includes(user.role)) return;
    Promise.resolve(withTimeout(supabase.from('tutor_profiles').select('is_verified').eq('user_id', user.id).maybeSingle()).then(({ data, error }) => {
      if (cancelled) return;
      if (error) setTutorError(true);
      else setTutorVerified(data?.is_verified === true && user.role !== 'tutor_pending');
    })).catch(() => { if (!cancelled) setTutorError(true); });
    return () => { cancelled = true; };
  }, [user, isAdmin]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    main.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  if (loading) return <div className="min-h-screen flex items-center justify-center" role="status">Opening your account…</div>;
  if (user && !isAdmin && TUTOR_ROLES.includes(user.role)) {
    if (tutorError) return <main className="mx-auto max-w-lg p-8 text-center space-y-4" role="alert"><p>Could not check tutor verification. Please retry.</p><button className="rounded-lg border px-4 py-3" onClick={fetchUser}>Retry</button><button className="rounded-lg border px-4 py-3" onClick={signOut}>Sign out</button></main>;
    if (tutorVerified === null) return <div className="p-8 text-center" role="status">Checking tutor verification…</div>;
    if (!tutorVerified) return <TutorPendingScreen user={user} onRefresh={fetchUser} />;
  }
  return <div className="min-h-screen bg-background flex flex-col">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:p-3 focus:text-primary-foreground">Skip to content</a>
    <div className="hidden lg:block"><Navbar user={user} /></div>
    <div className="lg:hidden"><MobileHeader user={user} /></div>
    <main id="main-content" ref={main} tabIndex={-1} className="app-main flex-1 outline-none">
      <motion.div key={location.pathname} initial={{ opacity: reducedMotion ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.15 }}><Outlet context={{ user }} /></motion.div>
    </main>
    <div className="lg:hidden"><MobileBottomTabs user={user} /></div>
    <div className="hidden lg:block"><Footer /></div>
  </div>;
}
