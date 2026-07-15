// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// Hardcoded fallback (only for recovery - should be database-driven)
const SUPER_ADMIN_EMAILS = ['aneleqamata95@gmail.com', 'aneleq@techandguard.co.za'];

// ============================================================
// PropTypes
// ============================================================

const propTypes = {
  /** Child components to render when access is granted */
  children: PropTypes.node.isRequired,
  /** Array of role names allowed to access this route */
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  /** Path to redirect to if access is denied */
  redirectTo: PropTypes.string,
  /** Optional fallback component while loading */
  fallback: PropTypes.node,
};

// ============================================================
// Helper: Log Activity (with deduplication)
// ============================================================

const logActivity = async (eventType, user, metadata = {}) => {
  if (!user?.email) return;
  
  try {
    await supabase
      .from('activity_log')
      .insert({
        event_type: eventType,
        user_email: user.email,
        user_id: user.id || null,
        description: `${eventType.replace(/_/g, ' ')}: ${metadata.path || 'unknown path'}`,
        metadata: {
          role: user.role,
          allowed_roles: metadata.allowedRoles || [],
          path: metadata.path || window.location.pathname,
          access_granted: metadata.accessGranted,
          reason: metadata.reason,
          // Add a deduplication marker
          _logged_at: new Date().toISOString()
        }
      });
  } catch (err) {
    // Silent fail - logging should never break the user experience
    console.warn('Activity log error:', err);
  }
};

// ============================================================
// Main Component
// ============================================================

export default function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  redirectTo = '/', 
  fallback = null 
}) {
  const { user, isLoadingAuth, role } = useAuth();

  // ✅ FIXED: Track if we've already logged this access attempt
  const hasLoggedRef = useRef(false);
  const currentPathRef = useRef(window.location.pathname);

  // ✅ FIXED: Stable allowedRoles string for dependency comparison
  const allowedRolesKey = useMemo(() => {
    return JSON.stringify(allowedRoles);
  }, [allowedRoles]);

  // ============================================================
  // ✅ FIXED: Compute access decision in useMemo (no side effects)
  // ============================================================

  const accessDecision = useMemo(() => {
    if (!user) {
      return { granted: false, reason: 'unauthenticated' };
    }

    // Check if super admin
    const isSuperAdmin = user.is_super_admin === true || 
                         SUPER_ADMIN_EMAILS.includes(user.email);
    
    if (isSuperAdmin) {
      return { granted: true, reason: 'super_admin' };
    }

    // Check allowed roles - using the stable key for comparison
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      return { granted: false, reason: 'insufficient_role' };
    }

    return { granted: true, reason: 'role_match' };
  }, [user, role, allowedRoles]);

  // ============================================================
  // ✅ FIXED: Single useEffect with deduplication
  // ============================================================

  useEffect(() => {
    // Only log once when the decision is finalized and user exists
    if (!user || isLoadingAuth) return;

    // ✅ FIXED: Check if we've already logged for this path/decision combo
    const currentPath = window.location.pathname;
    const logKey = `${currentPath}_${accessDecision.granted}_${accessDecision.reason}`;
    
    // Reset the ref when the path changes (navigation)
    if (currentPath !== currentPathRef.current) {
      currentPathRef.current = currentPath;
      hasLoggedRef.current = false;
    }

    // Skip if already logged for this session/path
    if (hasLoggedRef.current) return;
    hasLoggedRef.current = true;

    const eventType = accessDecision.granted 
      ? 'route_access_granted' 
      : 'route_access_denied';

    const metadata = {
      path: currentPath,
      allowedRoles: allowedRoles,
      role: role,
      accessGranted: accessDecision.granted,
      reason: accessDecision.reason,
    };

    logActivity(eventType, user, metadata);
  }, [user, role, allowedRolesKey, accessDecision.granted, accessDecision.reason, isLoadingAuth]);

  // ============================================================
  // Loading State
  // ============================================================

  if (isLoadingAuth) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // Unauthenticated
  // ============================================================

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ============================================================
  // Access Denied - Insufficient Role
  // ============================================================

  if (!accessDecision.granted) {
    return <Navigate to={redirectTo} replace />;
  }

  // ============================================================
  // Access Granted
  // ============================================================

  return children;
}

// Add PropTypes
ProtectedRoute.propTypes = propTypes;
