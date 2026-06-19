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
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
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

// ============================================================
// 🔐 COMPONENT: Require Login + Onboarding (with Admin Bypass)
// ============================================================
const RequireAuthAndOnboarding = ({ children }) => {
  const { user, isLoadingAuth } = useAuth();
  
  // ✅ Admin emails that should bypass onboarding
  const ADMIN_EMAILS = ['aneleqamata95@gmail.com', 'aneleq@techandguard.co.za'];
  
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // ✅ ADMIN BYPASS: Check if user is admin
  const isAdmin = ADMIN_EMAILS.includes(user.email) || 
                  user.role === 'admin' || 
                  user.is_super_admin === true;
  
  // If admin, skip onboarding check - they have full access
  if (isAdmin) {
    return children;
  }
  
  // For non-admins: check if onboarding is complete
  if (user && !user.onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }
  
  // User is logged in, not admin, and has completed onboarding
  return children;
};

// ============================================================
// 🏠 MAIN APP
// ============================================================
const AuthenticatedApp = () => {
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

  return (
    <Routes>
      {/* ================================================================
          🚪 PUBLIC ROUTES (No Login Required)
          ================================================================ */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/about-tech-guard" element={<AboutTechAndGuard />} />

      {/* ================================================================
          🔐 ONBOARDING (Login Required, Admin bypass handled inside)
          ================================================================ */}
      <Route 
        path="/onboarding" 
        element={
          <ProtectedRoute allowedRoles={['user', 'Student', 'Parent', 'Tutor', 'Admin']}>
            <Onboarding />
          </ProtectedRoute>
        } 
      />

      {/* ================================================================
          🔐 PROTECTED ROUTES (Login + Onboarding Required, Admin Bypass)
          ================================================================ */}
      <Route element={<AppLayout />}>
        
        {/* Home - Requires login + onboarding (admin bypass) */}
        <Route 
          path="/" 
          element={
            <RequireAuthAndOnboarding>
              <Home />
            </RequireAuthAndOnboarding>
          } 
        />
        
        {/* Subjects */}
        <Route 
          path="/subjects" 
          element={
            <RequireAuthAndOnboarding>
              <Subjects />
            </RequireAuthAndOnboarding>
          } 
        />
        
        <Route 
          path="/subjects/:code" 
          element={
            <RequireAuthAndOnboarding>
              <SubjectDetail />
            </RequireAuthAndOnboarding>
          } 
        />
        
        {/* Tutors */}
        <Route 
          path="/tutors" 
          element={
            <RequireAuthAndOnboarding>
              <Tutors />
            </RequireAuthAndOnboarding>
          } 
        />
        
        {/* Premium */}
        <Route 
          path="/premium" 
          element={
            <RequireAuthAndOnboarding>
              <Premium />
            </RequireAuthAndOnboarding>
          } 
        />

        {/* ================================================================
            📊 STUDENT DASHBOARD
           ================================================================ */}
        <Route 
          path="/student-dashboard" 
          element={
            <RequireAuthAndOnboarding>
              <ProtectedRoute allowedRoles={['Student', 'Parent', 'Tutor', 'Admin']}>
                <StudentDashboard />
              </ProtectedRoute>
            </RequireAuthAndOnboarding>
          } 
        />

        {/* ================================================================
            👨‍👩‍👧 PARENT DASHBOARD (Admin can access)
           ================================================================ */}
        <Route 
          path="/parent-dashboard" 
          element={
            <RequireAuthAndOnboarding>
              <ProtectedRoute allowedRoles={['Parent', 'Admin']}>
                <ParentDashboard />
              </ProtectedRoute>
            </RequireAuthAndOnboarding>
          } 
        />

        {/* ================================================================
            🎓 TUTOR DASHBOARD
           ================================================================ */}
        <Route 
          path="/tutor-dashboard" 
          element={
            <RequireAuthAndOnboarding>
              <ProtectedRoute allowedRoles={['Tutor', 'Admin']}>
                <TutorDashboard />
              </ProtectedRoute>
            </RequireAuthAndOnboarding>
          } 
        />

        {/* ================================================================
            🔧 ADMIN DASHBOARD (Admin only)
           ================================================================ */}
        <Route 
          path="/admin" 
          element={
            <RequireAuthAndOnboarding>
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            </RequireAuthAndOnboarding>
          } 
        />

        {/* ================================================================
            📚 OTHER PROTECTED ROUTES
           ================================================================ */}
        <Route 
          path="/bookings" 
          element={
            <RequireAuthAndOnboarding>
              <ProtectedRoute allowedRoles={['Student', 'Parent', 'Tutor', 'Admin']}>
                <Bookings />
              </ProtectedRoute>
            </RequireAuthAndOnboarding>
          } 
        />

        <Route 
          path="/search" 
          element={
            <RequireAuthAndOnboarding>
              <ProtectedRoute allowedRoles={['Student', 'Parent', 'Tutor', 'Admin']}>
                <ResourceSearch />
              </ProtectedRoute>
            </RequireAuthAndOnboarding>
          } 
        />

        <Route 
          path="/quiz" 
          element={
            <RequireAuthAndOnboarding>
              <ProtectedRoute allowedRoles={['Student', 'Parent', 'Tutor', 'Admin']}>
                <PracticeQuiz />
              </ProtectedRoute>
            </RequireAuthAndOnboarding>
          } 
        />

        <Route 
          path="/study-rooms" 
          element={
            <RequireAuthAndOnboarding>
              <ProtectedRoute allowedRoles={['Student', 'Parent', 'Tutor', 'Admin']}>
                <GroupStudyRooms />
              </ProtectedRoute>
            </RequireAuthAndOnboarding>
          } 
        />

        <Route 
          path="/videos" 
          element={
            <RequireAuthAndOnboarding>
              <ProtectedRoute allowedRoles={['Student', 'Parent', 'Tutor', 'Admin']}>
                <VideoLessons />
              </ProtectedRoute>
            </RequireAuthAndOnboarding>
          } 
        />

        <Route 
          path="/resources-library" 
          element={
            <RequireAuthAndOnboarding>
              <ProtectedRoute allowedRoles={['Student', 'Parent', 'Tutor', 'Admin']}>
                <ResourcesLibrary />
              </ProtectedRoute>
            </RequireAuthAndOnboarding>
          } 
        />

        <Route 
          path="/forum" 
          element={
            <RequireAuthAndOnboarding>
              <ProtectedRoute allowedRoles={['Student', 'Parent', 'Tutor', 'Admin']}>
                <CommunityForum />
              </ProtectedRoute>
            </RequireAuthAndOnboarding>
          } 
        />

        <Route 
          path="/bursaries" 
          element={
            <RequireAuthAndOnboarding>
              <ProtectedRoute allowedRoles={['Student', 'Parent', 'Tutor', 'Admin']}>
                <BursaryFinder />
              </ProtectedRoute>
            </RequireAuthAndOnboarding>
          } 
        />

        <Route 
          path="/opportunities" 
          element={
            <RequireAuthAndOnboarding>
              <ProtectedRoute allowedRoles={['Student', 'Parent', 'Tutor', 'Admin']}>
                <StudentOpportunities />
              </ProtectedRoute>
            </RequireAuthAndOnboarding>
          } 
        />

        {/* Admin only routes */}
        <Route 
          path="/caps-admin" 
          element={
            <RequireAuthAndOnboarding>
              <ProtectedRoute allowedRoles={['Admin']}>
                <CAPSAdmin />
              </ProtectedRoute>
            </RequireAuthAndOnboarding>
          } 
        />

        <Route 
          path="/payout-log" 
          element={
            <RequireAuthAndOnboarding>
              <ProtectedRoute allowedRoles={['Admin']}>
                <PayoutLog />
              </ProtectedRoute>
            </RequireAuthAndOnboarding>
          } 
        />

        <Route 
          path="/counselor" 
          element={
            <RequireAuthAndOnboarding>
              <ProtectedRoute allowedRoles={['Admin']}>
                <CounselorDashboard />
              </ProtectedRoute>
            </RequireAuthAndOnboarding>
          } 
        />

        {/* 404 Fallback */}
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
