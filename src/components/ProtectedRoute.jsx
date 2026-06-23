// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [], redirectTo = '/', fallback = null }) {
  const { user, isLoadingAuth, role } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ ADMIN BYPASS: Super admins (hardcoded or is_super_admin) always pass
  const SUPER_ADMIN_EMAILS = ['aneleqamata95@gmail.com', 'aneleq@techandguard.co.za'];
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email) || user.is_super_admin === true;

  if (isSuperAdmin) {
    return children;
  }

  // Check allowed roles (if any)
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
