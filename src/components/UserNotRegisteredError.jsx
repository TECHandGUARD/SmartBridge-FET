import React from 'react';
import { AlertCircle, Mail, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

const UserNotRegisteredError = ({ 
  onRetry, 
  contactEmail = 'aneleq@techandguard.co.za' 
}) => {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out');
    } else {
      window.location.href = '/';
    }
  };

  const handleContactSupport = () => {
    window.location.href = `mailto:${contactEmail}?subject=SmartBridge%20FET%20Access%20Request`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-orange-100">
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Access Restricted</h1>
          <p className="text-slate-600 mb-6">
            You are not registered to use SmartBridge FET. Please contact the administrator to request access.
          </p>
          
          <div className="p-4 bg-slate-50 rounded-md text-sm text-slate-600 mb-6">
            <p className="font-medium mb-2">What you can do:</p>
            <ul className="list-disc list-inside space-y-1 text-left">
              <li>Verify you are logged in with the correct account</li>
              <li>Contact the app administrator for access</li>
              <li>Try logging out and back in again</li>
            </ul>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={handleContactSupport}
            >
              <Mail className="w-4 h-4" />
              Contact Administrator
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full gap-2 text-slate-600"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
            
            {onRetry && (
              <Button 
                variant="default" 
                className="w-full gap-2 bg-primary"
                onClick={onRetry}
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;
