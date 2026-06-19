import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from 'sonner';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PageNotFound from './lib/PageNotFound';

// Page imports
import Home from './pages/Home';
import Subjects from './pages/Subjects';
import SubjectDetail from './pages/SubjectDetail';
import StudentDashboard from './pages/StudentDashboard';
import ParentDashboard from './pages/ParentDashboard';
import TutorDashboard from './pages/TutorDashboard';
import Tutors from './pages/Tutors';
import Premium from './pages/Premium';
import AdminDashboard from './pages/AdminDashboard';
import Onboarding from './pages/Onboarding';
import ResourceSearch from './pages/ResourceSearch';
import PracticeQuiz from './pages/PracticeQuiz';
import Bookings from './pages/Bookings';
import GroupStudyRooms from './pages/GroupStudyRooms';
import VideoLessons from './pages/VideoLessons';
import ResourcesLibrary from './pages/ResourcesLibrary';
import CAPSAdmin from './pages/CAPSAdmin';
import PayoutLog from './pages/PayoutLog';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import AboutTechAndGuard from './pages/AboutTechAndGuard';
import StudentOpportunities from './pages/StudentOpportunities';
import CommunityForum from './pages/CommunityForum';
import CounselorDashboard from './pages/CounselorDashboard';
import BursaryFinder from './pages/BursaryFinder';

const AuthenticatedApp = () => {
  // Extracting 'user' or 'session' from your AuthContext to track login state
  const { isLoadingAuth, authError, user } = useAuth();

  // Loading state
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-2">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
          Loading SmartBridge FET...
        </span>
      </div>
    );
  }

  // Handle user not registered error
  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // 1. GUEST/UNAUTHENTICATED ROUTING FLOW
  // If no user exists, direct all sub-links smoothly back to the root entry page
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Home />} />
        {/* If a logged-out user tries to access /login, /dashboard, etc., route to / */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // 2. SIGNED-IN ROUTING FLOW
  return (
    <Routes>
      <Route element={<AppLayout />}>
        
        {/* ================================================================
            PUBLIC LAYOUT PATHS (Accessible while signed in)
           ================================================================ */}
        <Route path="/" element={<Home />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/subjects/:code" element={<SubjectDetail />} />
        <Route path="/tutors" element={<Tutors />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/about-tech-guard" element={<AboutTechAndGuard />} />
        
        {/* ================================================================
            PROTECTED DASHBOARD PATHS
           ================================================================ */}
        <Route element={<ProtectedRoute allowedRoles={['Student', 'Parent', 'Tutor', 'Admin']} />}>
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/parent-dashboard" element={<ParentDashboard />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/search" element={<ResourceSearch />} />
          <Route path="/quiz" element={<PracticeQuiz />} />
          <Route path="/study-rooms" element={<GroupStudyRooms />} />
          <Route path="/videos" element={<VideoLessons />} />
          <Route path="/resources-library" element={<ResourcesLibrary />} />
          <Route path="/forum" element={<CommunityForum />} />
          <Route path="/bursaries" element={<BursaryFinder />} />
          <Route path="/opportunities" element={<StudentOpportunities />} />
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>
        
        {/* ================================================================
            TUTOR PATHS
           ================================================================ */}
        <Route element={<ProtectedRoute allowedRoles={['Tutor', 'Admin']} redirectTo="/student-dashboard" />}>
          <Route path="/tutor-dashboard" element={<TutorDashboard />} />
        </Route>
        
        {/* ================================================================
            ADMIN PATHS
           ================================================================ */}
        <Route element={<ProtectedRoute allowedRoles={['Admin']} redirectTo="/student-dashboard" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/caps-admin" element={<CAPSAdmin />} />
          <Route path="/payout-log" element={<PayoutLog />} />
          <Route path="/counselor" element={<CounselorDashboard />} />
        </Route>
        
        {/* 404 Fallback within layout context */}
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </AuthProvider>
  );
}
