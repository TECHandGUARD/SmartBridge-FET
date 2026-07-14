// src/App.jsx
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',
  APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
  
  // Feature flags
  ENABLE_LAZY_LOADING: import.meta.env.VITE_ENABLE_LAZY_LOADING !== 'false',
  ENABLE_ERROR_BOUNDARY: import.meta.env.VITE_ENABLE_ERROR_BOUNDARY !== 'false',
  
  // Messages
  MESSAGES: {
    LOADING: import.meta.env.VITE_APP_LOADING_MSG || 'Loading...',
    ERROR_TITLE: import.meta.env.VITE_APP_ERROR_TITLE || 'Something went wrong',
    ERROR_DESC: import.meta.env.VITE_APP_ERROR_DESC || 'Please try refreshing the page.',
  },
};

// ============================================================
// Lazy Loading (Performance Optimization)
// ============================================================

const LazyLoad = (Component) => {
  return function WrappedComponent(props) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground animate-pulse">{CONFIG.MESSAGES.LOADING}</p>
          </div>
        }
      >
        <Component {...props} />
      </Suspense>
    );
  };
};

// Lazy-loaded pages (if enabled)
const LazyHome = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/Home')) : null;
const LazySubjects = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/Subjects')) : null;
const LazySubjectDetail = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/SubjectDetail')) : null;
const LazyPremium = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/Premium')) : null;
const LazyPrivacyPolicy = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/PrivacyPolicy')) : null;
const LazyTermsOfService = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/TermsOfService')) : null;
const LazyAboutTechAndGuard = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/AboutTechAndGuard')) : null;
const LazyStudentDashboard = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/StudentDashboard')) : null;
const LazyParentDashboard = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/ParentDashboard')) : null;
const LazyTutorDashboard = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/TutorDashboard')) : null;
const LazyAdminDashboard = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/AdminDashboard')) : null;
const LazyCounselorDashboard = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/CounselorDashboard')) : null;
const LazyTutors = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/Tutors')) : null;
const LazyResourceSearch = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/ResourceSearch')) : null;
const LazyPracticeQuiz = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/PracticeQuiz')) : null;
const LazyBookings = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/Bookings')) : null;
const LazyGroupStudyRooms = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/GroupStudyRooms')) : null;
const LazyVideoLessons = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/VideoLessons')) : null;
const LazyResourcesLibrary = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/ResourcesLibrary')) : null;
const LazyCommunityForum = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/CommunityForum')) : null;
const LazyBursaryFinder = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/BursaryFinder')) : null;
const LazyStudentOpportunities = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/StudentOpportunities')) : null;
const LazyCAPSAdmin = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/CAPSAdmin')) : null;
const LazyPayoutLog = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/PayoutLog')) : null;
const LazyOnboarding = CONFIG.ENABLE_LAZY_LOADING ? lazy(() => import('./pages/Onboarding')) : null;

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
// Page Component (with optional lazy loading)
// ============================================================

function Page({ component: Component, ...props }) {
  if (CONFIG.ENABLE_LAZY_LOADING) {
    return <Component {...props} />;
  }
  return <Component {...props} />;
}

// ============================================================
// AuthenticatedApp Component
// ============================================================

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Handle auth loading
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Handle auth errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Wrap content with ErrorBoundary if enabled
  const content = (
    <Routes>
      <Route element={<AppLayout />}>
        
        {/* ============================================================
            PUBLIC ROUTES - No authentication required
            ============================================================ */}
        <Route path="/" element={<Page component={Home} />} />
        <Route path="/subjects" element={<Page component={Subjects} />} />
        <Route path="/subjects/:code" element={<Page component={SubjectDetail} />} />
        <Route path="/tutors" element={<Page component={Tutors} />} />
        <Route path="/premium" element={<Page component={Premium} />} />
        <Route path="/privacy" element={<Page component={PrivacyPolicy} />} />
        <Route path="/terms" element={<Page component={TermsOfService} />} />
        <Route path="/about-tech-guard" element={<Page component={AboutTechAndGuard} />} />
        
        {/* ============================================================
            AUTHENTICATED ROUTES - Any logged-in user
            ============================================================ */}
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
        
        {/* ============================================================
            TUTOR-ONLY ROUTES
            ============================================================ */}
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
        
        {/* ============================================================
            ADMIN-ONLY ROUTES
            ============================================================ */}
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
        
        {/* ============================================================
            COUNSELOR-ONLY ROUTES
            ============================================================ */}
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
        
        {/* ============================================================
            ONBOARDING ROUTE - Users with role 'user'
            ============================================================ */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<Page component={Onboarding} />} />
        </Route>
        
        {/* ============================================================
            404 - Page Not Found
            ============================================================ */}
        <Route path="*" element={<PageNotFound />} />
        
      </Route>
    </Routes>
  );

  if (CONFIG.ENABLE_ERROR_BOUNDARY) {
    return (
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => {
          window.location.href = '/';
        }}
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
  // Set document title
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
