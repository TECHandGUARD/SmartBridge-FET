import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppLayout from './components/layout/AppLayout';

// Page imports
import Home from './pages/Home';
import Login from './pages/Login';
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

const AuthenticatedApp = () => {
  const { isLoadingAuth, authChecked, isAuthenticated } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not authenticated, ONLY show login page (no Home page access)
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/about-tech-guard" element={<AboutTechAndGuard />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  // Authenticated routes with AppLayout
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/subjects/:code" element={<SubjectDetail />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/parent-dashboard" element={<ParentDashboard />} />
        <Route path="/tutor-dashboard" element={<TutorDashboard />} />
        <Route path="/tutors" element={<Tutors />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/search" element={<ResourceSearch />} />
        <Route path="/quiz" element={<PracticeQuiz />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/study-rooms" element={<GroupStudyRooms />} />
        <Route path="/videos" element={<VideoLessons />} />
        <Route path="/resources-library" element={<ResourcesLibrary />} />
        <Route path="/caps-admin" element={<CAPSAdmin />} />
        <Route path="/payout-log" element={<PayoutLog />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/about-tech-guard" element={<AboutTechAndGuard />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
