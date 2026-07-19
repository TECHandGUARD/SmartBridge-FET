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
import { useEffect, Suspense, lazy } from 'react';
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
// Import all page components (with lazy loading for better performance)
// ============================================================

// ✅ LAZY LOAD DASHBOARDS to prevent them from loading until needed
const Home = lazy(() => import('./pages/Home'));
const Subjects = lazy(() => import('./pages/Subjects'));
const SubjectDetail = lazy(() => import('./pages/SubjectDetail'));
const Premium = lazy(() => import('./pages/Premium'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const AboutTechAndGuard = lazy(() => import('./pages/AboutTechAndGuard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'));
const TutorDashboard = lazy(() => import('./pages/TutorDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CounselorDashboard = lazy(() => import('./pages/CounselorDashboard'));
const Tutors = lazy(() => import('./pages/Tutors'));
const ResourceSearch = lazy(() => import('./pages/ResourceSearch'));
const PracticeQuiz = lazy(() => import('./pages/PracticeQuiz'));
const Bookings = lazy(() => import('./pages/Bookings'));
const GroupStudyRooms = lazy(() => import('./pages/GroupStudyRooms'));
const VideoLessons = lazy(() => import('./pages/VideoLessons'));
const ResourcesLibrary = lazy(() => import('./pages/ResourcesLibrary'));
const CommunityForum = lazy(() => import('./pages/CommunityForum'));
const BursaryFinder = lazy(() => import('./pages/BursaryFinder'));
const StudentOpportunities = lazy(() => import('./pages/StudentOpportunities'));
const CAPSAdmin = lazy(() => import('./pages/CAPSAdmin'));
const PayoutLog = lazy(() => import('./pages/PayoutLog'));
const Onboarding = lazy(() => import('./pages/Onboarding'));

// Auth pages (keep them immediate since they're critical)
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AuthCallback from './pages/AuthCallback';
import ResetPassword from './pages/ResetPassword';

// ============================================================
// 🔧 Page Wrapper with Suspense & Error Boundary
// ============================================================

function PageWrapper({ children }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

// ============================================================
// Dashboard Wrapper with Reset on Error
// ============================================================

function DashboardWrapper({ children, dashboardName }) {
  const [resetKey, setResetKey] = useState(0);

  const handleReset = () => {
    // Force re-mount the component
    setResetKey(prev => prev + 1);
  };

  return (
    <ErrorBoundary
      key={resetKey}
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="text-center max-w-md border border-destructive/20 bg-destructive/5 rounded-2xl p-8">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="font-playfair text-xl font-bold text-foreground mb-2">
              Failed to load {dashboardName || 'Dashboard'}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {CONFIG.MESSAGES.ERROR_DESC}
            </p>
            {CONFIG.APP_ENV === 'development' && (
              <pre className="text-xs text-left bg-muted p-3 rounded-lg overflow-auto max-h-32 mb-4">
                {error?.message || 'Unknown error'}
              </pre>
            )}
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button 
                onClick={() => {
                  resetErrorBoundary();
                  handleReset();
                }} 
                variant="outline" 
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </Button>
              <Button 
                onClick={() => window.location.href = '/'} 
                variant="ghost"
                className="gap-2"
              >
                Return Home
              </Button>
            </div>
          </div>
        </div>
      )}
      onReset={() => {
        // Additional cleanup if needed
        console.log(`🔄 Resetting ${dashboardName || 'Dashboard'}`);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// ============================================================
// Page Component
// ============================================================

function Page({ component: Component, ...props }) {
  return (
    <PageWrapper>
      <Component {...props} />
    </PageWrapper>
  );
}

// ============================================================
// Dashboard Page Component (with extra error handling)
// ============================================================

function DashboardPage({ component: Component, name, ...props }) {
  return (
    <PageWrapper>
      <DashboardWrapper dashboardName={name}>
        <Component {...props} />
      </DashboardWrapper>
    </PageWrapper>
  );
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
      <Route path="/reset-password" element={<ResetPassword />} />

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
          <Route 
            path="/student-dashboard" 
            element={<DashboardPage component={StudentDashboard} name="Student Dashboard" />} 
          />
          <Route 
            path="/parent-dashboard" 
            element={<DashboardPage component={ParentDashboard} name="Parent Dashboard" />} 
          />
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
          <Route 
            path="/tutor-dashboard" 
            element={<DashboardPage component={TutorDashboard} name="Tutor Dashboard" />} 
          />
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
          <Route 
            path="/admin" 
            element={<DashboardPage component={AdminDashboard} name="Admin Dashboard" />} 
          />
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
