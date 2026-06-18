import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, requireAdmin = false, requireTutor = false }) {
  const { user, loading, role, isAdmin, isTutor, isStudent } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check for admin access
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check for tutor access
  if (requireTutor && !isTutor) {
    return <Navigate to="/dashboard" replace />;
  }

  // If all checks pass, render the children
  return children;
}
