import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, ShieldAlert, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'aneleq@techandguard.co.za';

// ============================================================
// Main Component
// ============================================================

export default function PageNotFound() {
  const currentBrowserLocation = useLocation();
  const targetedUrlPathString = currentBrowserLocation.pathname.substring(1) || 'dashboard';
  
  // ✅ FIXED: Use AuthContext instead of duplicate query
  const { user, isAuthenticated, isLoadingAuth, isAdmin } = useAuth();

  // ✅ FIXED: Use Link for smooth navigation
  const handleNavigateHome = (e) => {
    // If there's an error or we want to force a refresh, we can still use the link
    // The Link component handles the navigation without page reload
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="max-w-md w-full animate-fadeIn">
        <div className="text-center space-y-6 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
          
          {/* Icon */}
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto">
              <AlertCircle className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h1 className="text-6xl font-black text-slate-200 dark:text-slate-700 tracking-tight">404</h1>
            <div className="h-1 w-12 bg-primary rounded-full mx-auto"></div>
          </div>
          
          {/* Message */}
          <div className="space-y-2.5">
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              Page Not Found
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              The page <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border text-xs">/{targetedUrlPathString}</span> could not be found in this application.
            </p>
          </div>
          
          {/* Admin Advisory - Uses AuthContext */}
          {!isLoadingAuth && isAuthenticated && isAdmin && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-left">
              <div className="flex items-start space-x-2.5">
                <ShieldAlert className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    System Administrator Advisory
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    This route is not registered in the application routing table. 
                    Please verify your route configuration or contact support at{' '}
                    <a 
                      href={`mailto:${SUPPORT_EMAIL}`} 
                      className="text-primary hover:underline"
                    >
                      {SUPPORT_EMAIL}
                    </a>.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* ✅ FIXED: Use Link for smooth navigation */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link 
              to="/"
              className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-primary hover:border-primary/30 shadow-sm transition-all duration-200 gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Home className="w-4 h-4" />
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
