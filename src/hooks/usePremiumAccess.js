/**
 * ====================================================================
 * SECURITY SUBSCRIPTION GATEWAY: SMARTBRIDGE FET
 * INFRASTRUCTURE: SECURE DATABASE-LINKED PREMIUM VALIDATION
 * PROTECTION MODEL: DEFENSIVE CLIENT-SIDE INTERFACE TOGGLING
 * ====================================================================
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ✅ Soft-coded TTL with environment variable
const CACHE_TTL = import.meta.env.VITE_PREMIUM_CACHE_TTL 
  ? parseInt(import.meta.env.VITE_PREMIUM_CACHE_TTL, 10) 
  : 60000; // Default: 1 minute

const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;

// ✅ Soft-coded admin emails from environment
const ADMIN_EMAILS = import.meta.env.VITE_ADMIN_EMAILS 
  ? import.meta.env.VITE_ADMIN_EMAILS.split(',').map(e => e.trim())
  : ['aneleqamata95@gmail.com', 'aneleq@techandguard.co.za'];

// ============================================================
// Cache (in-memory Map with TTL)
// ============================================================

const subscriptionCache = new Map();

// ============================================================
// Main Hook
// ============================================================

/**
 * usePremiumAccess - Centralized premium access validation
 * 
 * SECURITY NOTE: This hook is for UI rendering ONLY.
 * Actual premium content MUST be protected by:
 * 1. Supabase RLS policies on all premium tables
 * 2. Server-side middleware checking subscription status
 * 3. API route validation before serving premium content
 * 
 * @param {Object} user - User object with email, id, role
 * @returns {Object} Premium access state and utilities
 */
export default function usePremiumAccess(user) {
  // ✅ FIXED: Use primitive values for stable dependencies
  const userEmail = user?.email;
  const userId = user?.id;
  const userRole = user?.role;
  const isSuperAdminFlag = user?.is_super_admin === true;

  const [isPremium, setIsPremium] = useState(false);
  const [isOnTrial, setIsOnTrial] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mount ref for unmount protection
  const isMountedRef = useRef(true);

  // ============================================================
  // Utility: Calculate trial days remaining
  // ============================================================

  const calculateTrialDaysLeft = useCallback((trialStartStr) => {
    if (!trialStartStr) return 0;
    
    const trialStartTimeStamp = new Date(trialStartStr).getTime();
    const currentTimeStamp = Date.now();
    
    const millisecondsRemaining = (trialStartTimeStamp + THREE_DAYS_IN_MS) - currentTimeStamp;

    if (millisecondsRemaining > 0) {
      return Math.ceil(millisecondsRemaining / (24 * 60 * 60 * 1000));
    }
    return 0;
  }, []);

  // ============================================================
  // ✅ FIXED: Core verification function with primitive dependencies
  // ============================================================

  const verifyPremiumAccessRights = useCallback(async () => {
    if (!userEmail || !userId) {
      if (isMountedRef.current) {
        setIsPremium(false);
        setIsOnTrial(false);
        setTrialDaysLeft(0);
        setLoading(false);
      }
      return;
    }

    // Super admin check
    const isSuperAdmin = userRole === 'admin' || 
                         ADMIN_EMAILS.includes(userEmail) ||
                         isSuperAdminFlag;

    if (isSuperAdmin) {
      if (isMountedRef.current) {
        setIsPremium(true);
        setIsOnTrial(false);
        setTrialDaysLeft(0);
        setLoading(false);

        // Activity logging
        supabase
          .from('activity_log')
          .insert({
            event_type: 'premium_access_granted',
            user_email: userEmail,
            user_id: userId,
            description: 'Super admin premium access granted',
            metadata: {
              reason: isSuperAdminFlag ? 'database_field' : 'role_or_email'
            }
          })
          .catch(() => {});
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cacheKey = userEmail;
      const cached = subscriptionCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        const { isPremium: cachedPremium, isOnTrial: cachedTrial, trialDaysLeft: cachedDays } = cached.data;
        if (isMountedRef.current) {
          setIsPremium(cachedPremium);
          setIsOnTrial(cachedTrial);
          setTrialDaysLeft(cachedDays);
          setLoading(false);
        }
        return;
      }

      // Fetch subscription from Supabase
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('plan_tier, status, trial_started_at')
        .eq('student_email', userEmail.trim().toLowerCase())
        .maybeSingle();

      if (subError) {
        console.error('Subscription fetch error:', subError);
        // Don't throw - fallback to no access
      }

      let premium = false;
      let trial = false;
      let daysLeft = 0;

      // 1. Evaluate Paid Premium Tier Status
      if (subscription && subscription.plan_tier === 'premium' && subscription.status === 'active') {
        premium = true;
        trial = false;
        daysLeft = 0;

        // Log active premium access
        supabase
          .from('activity_log')
          .insert({
            event_type: 'premium_access_granted',
            user_email: userEmail,
            user_id: userId,
            description: 'Active premium subscription',
            metadata: {
              plan_tier: subscription.plan_tier,
              status: subscription.status
            }
          })
          .catch(() => {});
      } else {
        // 2. Evaluate 3-Day Trial Access
        const trialStartStr = subscription?.trial_started_at;
        if (trialStartStr) {
          const calculatedDays = calculateTrialDaysLeft(trialStartStr);
          if (calculatedDays > 0) {
            premium = true;
            trial = true;
            daysLeft = calculatedDays;

            // Log trial access
            supabase
              .from('activity_log')
              .insert({
                event_type: 'trial_access_granted',
                user_email: userEmail,
                user_id: userId,
                description: `Trial access - ${daysLeft} days remaining`,
                metadata: {
                  days_remaining: daysLeft
                }
              })
              .catch(() => {});
          }
        }
      }

      // Update state if still mounted
      if (isMountedRef.current) {
        setIsPremium(premium);
        setIsOnTrial(trial);
        setTrialDaysLeft(daysLeft);
      }

      // Cache result
      subscriptionCache.set(cacheKey, {
        data: { isPremium: premium, isOnTrial: trial, trialDaysLeft: daysLeft },
        timestamp: Date.now(),
      });

    } catch (err) {
      console.error('Failed to verify user credentials with payment engine:', err);
      if (isMountedRef.current) {
        setError(err);
        setIsPremium(false);
        setIsOnTrial(false);
        setTrialDaysLeft(0);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userEmail, userId, userRole, isSuperAdminFlag, calculateTrialDaysLeft]);

  // ============================================================
  // useEffect with cleanup
  // ============================================================

  useEffect(() => {
    isMountedRef.current = true;

    verifyPremiumAccessRights();

    return () => {
      isMountedRef.current = false;
    };
  }, [verifyPremiumAccessRights]);

  // ============================================================
  // ✅ FIXED: Public API Methods with proper loading state
  // ============================================================

  /**
   * Manual refresh - clears cache and re-fetches
   * ✅ FIXED: Uses setTimeout to ensure loading state renders
   */
  const refresh = useCallback(() => {
    if (userEmail) {
      subscriptionCache.delete(userEmail);
      
      // ✅ FIXED: Set loading, then use setTimeout to ensure UI updates
      setLoading(true);
      
      // Use setTimeout to break the synchronous state update chain
      // This ensures the loading spinner actually appears
      setTimeout(() => {
        verifyPremiumAccessRights();
      }, 0);
    }
  }, [userEmail, verifyPremiumAccessRights]);

  /**
   * Force re-check after subscription changes
   */
  const checkAccess = useCallback(() => {
    if (userEmail) {
      subscriptionCache.delete(userEmail);
      verifyPremiumAccessRights();
    }
  }, [userEmail, verifyPremiumAccessRights]);

  return { 
    isPremium, 
    isOnTrial, 
    trialDaysLeft, 
    loading, 
    error,
    refresh,
    checkAccess
  };
}
