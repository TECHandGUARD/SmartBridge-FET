// src/components/UserNotRegisteredError.jsx
import PropTypes from 'prop-types';
import { AlertCircle, Mail, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

// ============================================================
// 🔧 SOFT-CODED CONFIGURATION
// ============================================================

const CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBridge FET',
  SUPPORT_EMAIL: import.meta.env.VITE_SUPPORT_EMAIL || 'aneleq@techandguard.co.za',
};

// ============================================================
// PropTypes
// ============================================================

const propTypes = {
  /** Callback function to retry authentication */
  onRetry: PropTypes.func,
  /** Email address for support contact */
  contactEmail: PropTypes.string,
};

// ============================================================
// Main Component
// ============================================================

const UserNotRegisteredError = ({
  onRetry,
  contactEmail = CONFIG.SUPPORT_EMAIL,
}) => {
  // ============================================================
  // Handlers
  // ============================================================

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out. Please try again.');
    }
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent(`${CONFIG.APP_NAME} Access Request`);
    const body = encodeURIComponent(
      `I'm trying to access ${CONFIG.APP_NAME} but I'm receiving an "Access Restricted" message.\n\n` +
      `My email: \n` +
      `Role requested: \n\n` +
      `Please assist with access.`
    );
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-md w-full p-8 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-100 dark:border-slate-800">
        <div className="text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-orange-100 dark:bg-orange-950/30">
            <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            Access Restricted
          </h1>

          <p className="text-slate-600 dark:text-slate-400 mb-6">
            You are not registered to use {CONFIG.APP_NAME}. Please contact the administrator to request access.
          </p>

          {/* Help Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-md text-sm text-slate-600 dark:text-slate-400 mb-6">
            <p className="font-medium mb-2 text-slate-700 dark:text-slate-300">What you can do:</p>
            <ul className="list-disc list-inside space-y-1 text-left">
              <li>Verify you are logged in with the correct account</li>
              <li>Contact the app administrator for access</li>
              <li>Try logging out and back in again</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={handleContactSupport}
            >
              <Mail className="w-4 h-4" />
              Contact Administrator
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full gap-2 text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>

            {onRetry && (
              <Button
                type="button"
                variant="default"
                className="w-full gap-2 bg-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                onClick={onRetry}
              >
                Try Again
              </Button>
            )}
          </div>

          {/* Security Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] text-muted-foreground dark:text-slate-500 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3 text-green-500" />
              Secure · {CONFIG.APP_NAME}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add PropTypes
UserNotRegisteredError.propTypes = propTypes;

export default UserNotRegisteredError;
