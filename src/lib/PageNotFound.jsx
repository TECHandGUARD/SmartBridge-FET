import React from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Home, ShieldAlert, AlertCircle } from 'lucide-react';

export default function PageNotFound() {
  const currentBrowserLocation = useLocation();
  const targetedUrlPathString = currentBrowserLocation.pathname.substring(1) || 'dashboard';

  // Secure asynchronous state resolver checking user parameters directly via Supabase
  const { data: authData, isFetched } = useQuery({
    queryKey: ['routing-auth-state'],
    queryFn: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !session.user) {
          return { isAuthenticated: false, roleTier: null };
        }

        // Fetch custom role profile from user_profiles table
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('email', session.user.email)
          .maybeSingle();

        return { 
          isAuthenticated: true, 
          roleTier: profile?.role || null 
        };
      } catch (error) {
        console.error('Auth check error:', error);
        return { isAuthenticated: false, roleTier: null };
      }
    },
    staleTime: 5000, // Cache for 5 seconds
  });

  const handleNavigateHome = () => {
    window.location.href = '/';
  };

  const isAdmin = authData?.roleTier === 'admin';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans">
      <div className="max-w-md w-full animate-fadeIn">
        <div className="text-center space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
          
          {/* 404 Header */}
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mx-auto">
              <AlertCircle className="w-8 h-8 text-slate-400" />
            </div>
            <h1 className="text-6xl font-black text-slate-200 tracking-tight">404</h1>
            <div className="h-1 w-12 bg-primary rounded-full mx-auto"></div>
          </div>
          
          {/* Main Message */}
          <div className="space-y-2.5">
            <h2 className="text-xl font-extrabold text-slate-800">
              Page Not Found
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
              The page <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border text-xs">/{targetedUrlPathString}</span> could not be found in this application.
            </p>
          </div>
          
          {/* Admin Advisory (Professional) */}
          {isFetched && authData?.isAuthenticated && isAdmin && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left">
              <div className="flex items-start space-x-2.5">
                <ShieldAlert className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800">System Administrator Advisory</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    This route is not registered in the application routing table. 
                    Please verify your route configuration or contact support at{' '}
                    <a href="mailto:aneleq@techandguard.co.za" className="text-primary hover:underline">
                      aneleq@techandguard.co.za
                    </a>.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Action Button */}
          <div className="pt-2 border-t border-slate-100">
            <button 
              type="button"
              onClick={handleNavigateHome} 
              className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-primary hover:border-primary/30 shadow-sm transition-all duration-200 gap-2"
            >
              <Home className="w-4 h-4" />
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
