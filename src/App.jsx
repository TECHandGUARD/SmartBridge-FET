import React, { lazy, Suspense } from 'react';
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

// ============================================================
// 🚀 LAZY LOAD PAGES (Reduces initial bundle size)
// ============================================================
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Subjects = lazy(() => import('./pages/Subjects'));
const SubjectDetail = lazy(() => import('./pages/SubjectDetail'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'));
const TutorDashboard = lazy(() => import('./pages/TutorDashboard'));
const Tutors = lazy(() => import('./pages/Tutors'));
const Premium = lazy(() => import('./pages/Premium'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const ResourceSearch = lazy(() => import('./pages/ResourceSearch'));
const PracticeQuiz = lazy(() => import('./pages/PracticeQuiz'));
const Bookings = lazy(() => import('./pages/Bookings'));
const GroupStudyRooms = lazy(() => import('./pages/GroupStudyRooms'));
const VideoLessons = lazy(() => import('./pages/VideoLessons'));
const ResourcesLibrary = lazy(() => import('./pages/ResourcesLibrary'));
const CAPSAdmin = lazy(() => import('./pages/CAPSAdmin'));
const PayoutLog = lazy(() => import('./pages/PayoutLog'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const AboutTechAndGuard = lazy(() => import('./pages/AboutTechAndGuard'));
const StudentOpportunities = lazy(() => import('./pages/StudentOpportunities'));
const CommunityForum = lazy(() => import('./pages/CommunityForum'));
const CounselorDashboard = lazy(() => import('./pages/CounselorDashboard'));
const BursaryFinder = lazy(() => import('./pages/BursaryFinder'));

// ============================================================
// 🔐 COMPONENT: Require Login + Onboarding (with Admin Bypass)
// ============================================================
const RequireAuthAndOnboarding = ({ children }) => {
  const { user, isLoadingAuth } = useAuth();
  
  const ADMIN_EMAILS = ['aneleqamata95@gmail.com', 'aneleq@techandguard.co.za'];
  
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  const isAdmin = ADMIN_EMAILS.includes(user.email) || 
                  user.role === 'admin' || 
                  user.is_super_admin === true;
  
  if (isAdmin) {
    return children;
  }
  
  if (user && !user.onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return children;
};

// ============================================================
// 🏠 LOADING FALLBACK
// ============================================================
const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
  </div>
);

// ============================================================
// 🏠 AUTHENTICATED ROUTES
// ============================================================
const AuthenticatedApp = () => {
  const { isLoadingAuth, authError } = useAuth();

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

  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* 🚪 PUBLIC ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/about-tech-guard" element={<AboutTechAndGuard />} />

        {/* 🔐 ONBOARDING */}
        <Route 
          path="/onboarding" 
          element={
            <ProtectedRoute allowedRoles={['user', 'student', 'parent', 'sace_tutor', 'student_tutor', 'admin']}>
              <Onboarding />
            </ProtectedRoute>
          } 
        />

        {/* 🔐 PROTECTED ROUTES */}
        <Route element={<AppLayout />}>
          <Route 
            path="/" 
            element={
              <RequireAuthAndOnboarding>
                <Home />
              </RequireAuthAndOnboarding>
            } 
          />
          
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
          
          <Route 
            path="/tutors" 
            element={
              <RequireAuthAndOnboarding>
                <Tutors />
              </RequireAuthAndOnboarding>
            } 
          />
          
          <Route 
            path="/premium" 
            element={
              <RequireAuthAndOnboarding>
                <Premium />
              </RequireAuthAndOnboarding>
            } 
          />

          {/* 📊 STUDENT DASHBOARD */}
          <Route 
            path="/student-dashboard" 
            element={
              <RequireAuthAndOnboarding>
                <ProtectedRoute allowedRoles={['student', 'parent', 'sace_tutor', 'student_tutor', 'admin']}>
                  <StudentDashboard />
                </ProtectedRoute>
              </RequireAuthAndOnboarding>
            } 
          />

          {/* 👨‍👩‍👧 PARENT DASHBOARD */}
          <Route 
            path="/parent-dashboard" 
            element={
              <RequireAuthAndOnboarding>
                <ProtectedRoute allowedRoles={['parent', 'admin']}>
                  <ParentDashboard />
                </ProtectedRoute>
              </RequireAuthAndOnboarding>
            } 
          />

          {/* 🎓 TUTOR DASHBOARD */}
          <Route 
            path="/tutor-dashboard" 
            element={
              <RequireAuthAndOnboarding>
                <ProtectedRoute allowedRoles={['sace_tutor', 'student_tutor', 'admin']}>
                  <TutorDashboard />
                </ProtectedRoute>
              </RequireAuthAndOnboarding>
            } 
          />

          {/* 🔧 ADMIN DASHBOARD */}
          <Route 
            path="/admin" 
            element={
              <RequireAuthAndOnboarding>
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              </RequireAuthAndOnboarding>
            } 
          />

          {/* 📚 OTHER PROTECTED ROUTES */}
          <Route 
            path="/bookings" 
            element={
              <RequireAuthAndOnboarding>
                <ProtectedRoute allowedRoles={['student', 'parent', 'sace_tutor', 'student_tutor', 'admin']}>
                  <Bookings />
                </ProtectedRoute>
              </RequireAuthAndOnboarding>
            } 
          />

          <Route 
            path="/search" 
            element={
              <RequireAuthAndOnboarding>
                <ProtectedRoute allowedRoles={['student', 'parent', 'sace_tutor', 'student_tutor', 'admin']}>
                  <ResourceSearch />
                </ProtectedRoute>
              </RequireAuthAndOnboarding>
            } 
          />

          <Route 
            path="/quiz" 
            element={
              <RequireAuthAndOnboarding>
                <ProtectedRoute allowedRoles={['student', 'parent', 'sace_tutor', 'student_tutor', 'admin']}>
                  <PracticeQuiz />
                </ProtectedRoute>
              </RequireAuthAndOnboarding>
            } 
          />

          <Route 
            path="/study-rooms" 
            element={
              <RequireAuthAndOnboarding>
                <ProtectedRoute allowedRoles={['student', 'parent', 'sace_tutor', 'student_tutor', 'admin']}>
                  <GroupStudyRooms />
                </ProtectedRoute>
              </RequireAuthAndOnboarding>
            } 
          />

          <Route 
            path="/videos" 
            element={
              <RequireAuthAndOnboarding>
                <ProtectedRoute allowedRoles={['student', 'parent', 'sace_tutor', 'student_tutor', 'admin']}>
                  <VideoLessons />
                </ProtectedRoute>
              </RequireAuthAndOnboarding>
            } 
          />

          <Route 
            path="/resources-library" 
            element={
              <RequireAuthAndOnboarding>
                <ProtectedRoute allowedRoles={['student', 'parent', 'sace_tutor', 'student_tutor', 'admin']}>
                  <ResourcesLibrary />
                </ProtectedRoute>
              </RequireAuthAndOnboarding>
            } 
          />

          <Route 
            path="/forum" 
            element={
              <RequireAuthAndOnboarding>
                <ProtectedRoute allowedRoles={['student', 'parent', 'sace_tutor', 'student_tutor', 'admin']}>
                  <CommunityForum />
                </ProtectedRoute>
              </RequireAuthAndOnboarding>
            } 
          />

          <Route 
            path="/bursaries" 
            element={
              <RequireAuthAndOnboarding>
                <ProtectedRoute allowedRoles={['student', 'parent', 'sace_tutor', 'student_tutor', 'admin']}>
                  <BursaryFinder />
                </ProtectedRoute>
              </RequireAuthAndOnboarding>
            } 
          />

          <Route 
            path="/opportunities" 
            element={
              <RequireAuthAndOnboarding>
                <ProtectedRoute allowedRoles={['student', 'parent', 'sace_tutor', 'student_tutor', 'admin']}>
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
                <ProtectedRoute allowedRoles={['admin']}>
                  <CAPSAdmin />
                </ProtectedRoute>
              </RequireAuthAndOnboarding>
            } 
          />

          <Route 
            path="/payout-log" 
            element={
              <RequireAuthAndOnboarding>
                <ProtectedRoute allowedRoles={['admin']}>
                  <PayoutLog />
                </ProtectedRoute>
              </RequireAuthAndOnboarding>
            } 
          />

          <Route 
            path="/counselor" 
            element={
              <RequireAuthAndOnboarding>
                <ProtectedRoute allowedRoles={['admin']}>
                  <CounselorDashboard />
                </ProtectedRoute>
              </RequireAuthAndOnboarding>
            } 
          />

          {/* 404 Fallback */}
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

// ============================================================
// 🌐 ROOT APP EXPORT WITH PROVIDERS
// ============================================================
export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <Router>
          <AuthenticatedApp />
          <Toaster />
          <SonnerToaster position="top-right" richColors closeButton />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
