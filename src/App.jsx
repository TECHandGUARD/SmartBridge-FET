// src/App.jsx
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',
  APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
  ENABLE_ERROR_BOUNDARY: import.meta.env.VITE_ENABLE_ERROR_BOUNDARY !== 'false',
  MESSAGES: {
    ERROR_TITLE: import.meta.env.VITE_APP_ERROR_TITLE || 'Something went wrong',
    ERROR_DESC: import.meta.env.VITE_APP_ERROR_DESC || 'Please try refreshing the page.',
  },
};

// ============================================================
// Import all page components
// ============================================================

import Home from './pages/Home';
import Subjects from './pages/Subjects';
import SubjectDetail from './pages/SubjectDetail';
import Premium from './pages/Premium';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import AboutTechAndGuard from './pages/AboutTechAndGuard';
import StudentDashboard from './pages/StudentDashboard';
import ParentDashboard from './pages/ParentDashboard';
import TutorDashboard from './pages/TutorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CounselorDashboard from './pages/CounselorDashboard';
import Tutors from './pages/Tutors';
import ResourceSearch from './pages/ResourceSearch';
import PracticeQuiz from './pages/PracticeQuiz';
import Bookings from './pages/Bookings';
import GroupStudyRooms from './pages/GroupStudyRooms';
import VideoLessons from './pages/VideoLessons';  // ✅ FIXED: was './pages/Videos'
import ResourcesLibrary from './pages/ResourcesLibrary';
import CommunityForum from './pages/CommunityForum';
import BursaryFinder from './pages/BursaryFinder';
import StudentOpportunities from './pages/StudentOpportunities';
import CAPSAdmin from './pages/CAPSAdmin';
import PayoutLog from './pages/PayoutLog';
import Onboarding from './pages/Onboarding';

// ✅ NEW: Auth pages (you need to add these files later)
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AuthCallback from './pages/AuthCallback';

// ============================================================
// Fallback Component for Error Boundary
// ============================================================

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md border border-destructive/20 bg-destructive/5 rounded-2xl p-8">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="font-playfair text-xl font-bold text-foreground mb-2">
          {CONFIG.MESSAGES.ERROR_TITLE}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {CONFIG.MESSAGES.ERROR_DESC}
        </p>
        {CONFIG.APP_ENV === 'development' && (
          <pre className="text-xs text-left bg-muted p-3 rounded-lg overflow-auto max-h-32 mb-4">
            {error?.message || 'Unknown error'}
          </pre>
        )}
        <Button onClick={resetErrorBoundary} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Try Again
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Page Component
// ============================================================

function Page({ component: Component, ...props }) {
  return <Component {...props} />;
}

// ============================================================
// AuthenticatedApp Component
// ============================================================

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  const content = (
    <Routes>
      {/* ============================================================
          AUTH ROUTES - Full page (no header/footer)
          ============================================================ */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      {/* TODO: Add ResetPassword component if needed */}
      {/* <Route path="/reset-password" element={<ResetPassword />} /> */}

      {/* ============================================================
          MAIN APP LAYOUT (header + footer)
          ============================================================ */}
      <Route element={<AppLayout />}>
        {/* Public */}
        <Route path="/" element={<Page component={Home} />} />
        <Route path="/subjects" element={<Page component={Subjects} />} />
        <Route path="/subjects/:code" element={<Page component={SubjectDetail} />} />
        <Route path="/tutors" element={<Page component={Tutors} />} />
        <Route path="/premium" element={<Page component={Premium} />} />
        <Route path="/privacy" element={<Page component={PrivacyPolicy} />} />
        <Route path="/terms" element={<Page component={TermsOfService} />} />
        <Route path="/about-tech-guard" element={<Page component={AboutTechAndGuard} />} />

        {/* Authenticated */}
        <Route element={<ProtectedRoute />}>
          <Route path="/student-dashboard" element={<Page component={StudentDashboard} />} />
          <Route path="/parent-dashboard" element={<Page component={ParentDashboard} />} />
          <Route path="/bookings" element={<Page component={Bookings} />} />
          <Route path="/search" element={<Page component={ResourceSearch} />} />
          <Route path="/quiz" element={<Page component={PracticeQuiz} />} />
          <Route path="/study-rooms" element={<Page component={GroupStudyRooms} />} />
          <Route path="/videos" element={<Page component={VideoLessons} />} />
          <Route path="/resources-library" element={<Page component={ResourcesLibrary} />} />
          <Route path="/forum" element={<Page component={CommunityForum} />} />
          <Route path="/bursaries" element={<Page component={BursaryFinder} />} />
          <Route path="/opportunities" element={<Page component={StudentOpportunities} />} />
        </Route>

        {/* Tutor-only */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['sace_tutor', 'student_tutor', 'admin']}
              redirectTo="/"
            />
          }
        >
          <Route path="/tutor-dashboard" element={<Page component={TutorDashboard} />} />
        </Route>

        {/* Admin-only */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['admin']}
              redirectTo="/"
            />
          }
        >
          <Route path="/admin" element={<Page component={AdminDashboard} />} />
          <Route path="/caps-admin" element={<Page component={CAPSAdmin} />} />
          <Route path="/payout-log" element={<Page component={PayoutLog} />} />
        </Route>

        {/* Counselor-only */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['school_counselor', 'admin']}
              redirectTo="/"
            />
          }
        >
          <Route path="/counselor" element={<Page component={CounselorDashboard} />} />
        </Route>

        {/* Onboarding */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<Page component={Onboarding} />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );

  if (CONFIG.ENABLE_ERROR_BOUNDARY) {
    return (
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => window.location.href = '/'}
      >
        {content}
      </ErrorBoundary>
    );
  }

  return content;
};

// ============================================================
// Main App Component
// ============================================================

function App() {
  useEffect(() => {
    document.title = CONFIG.APP_NAME;
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
