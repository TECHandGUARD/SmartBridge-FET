/**
 * ====================================================================
 * SECURITY SUBSCRIPTION GATEWAY: SMARTBRIDGE FET
 * INFRASTRUCTURE: SECURE DATABASE-LINKED PREMIUM VALIDATION
 * PROTECTION MODEL: DEFENSIVE CLIENT-SIDE INTERFACE TOGGLING
 * ====================================================================
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Cache subscription data per user (still safe because it's just a UI toggle)
const subscriptionCache = new Map();
const CACHE_TTL = 60000; // 1 minute

/**
 * usePremiumAccess Hook
 * 
 * SECURITY NOTE: This hook is for UI rendering ONLY.
 * Actual premium content MUST be protected by:
 * 1. Supabase RLS policies on all premium tables
 * 2. Server-side middleware checking subscription status
 * 3. API route validation before serving premium content
 * 
 * This hook only toggles UI visibility - it does NOT enforce security.
 */
export default function usePremiumAccess(user) {
  const [isPremium, setIsPremium] = useState(false);
  const [isOnTrial, setIsOnTrial] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Utility: Calculate trial days remaining from timestamp
  const calculateTrialDaysLeft = useCallback((trialStartStr) => {
    if (!trialStartStr) return 0;
    
    const trialStartTimeStamp = new Date(trialStartStr).getTime();
    const currentTimeStamp = Date.now();
    
    const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;
    const millisecondsRemaining = (trialStartTimeStamp + THREE_DAYS_IN_MS) - currentTimeStamp;

    if (millisecondsRemaining > 0) {
      return Math.ceil(millisecondsRemaining / (24 * 60 * 60 * 1000));
    }
    return 0;
  }, []);

  useEffect(() => {
    if (!user?.email || !user?.id) {
      setIsPremium(false);
      setIsOnTrial(false);
      setTrialDaysLeft(0);
      setLoading(false);
      return;
    }

    // SUPER ADMIN OVERRIDE: System Administrators always bypass payment gates
    const adminEmails = ['aneleqamata95@gmail.com', 'aneleq@techandguard.co.za'];
    if (user.role === 'admin' || adminEmails.includes(user.email)) {
      setIsPremium(true);
      setIsOnTrial(false);
      setTrialDaysLeft(0);
      setLoading(false);
      return;
    }

    const verifyPremiumAccessRights = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check cache first
        const cacheKey = user.email;
        const cached = subscriptionCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
          const { isPremium: cachedPremium, isOnTrial: cachedTrial, trialDaysLeft: cachedDays } = cached.data;
          setIsPremium(cachedPremium);
          setIsOnTrial(cachedTrial);
          setTrialDaysLeft(cachedDays);
          setLoading(false);
          return;
        }

        // Fetch official, transaction-verified subscription records from Supabase
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('plan_tier, status, trial_started_at')
          .eq('student_email', user.email.trim().toLowerCase())
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
        } else {
          // 2. Evaluate 3-Day (72 Hours) Trial Access Parameters
          const trialStartStr = subscription?.trial_started_at;
          if (trialStartStr) {
            const calculatedDays = calculateTrialDaysLeft(trialStartStr);
            if (calculatedDays > 0) {
              premium = true;
              trial = true;
              daysLeft = calculatedDays;
            }
          }
        }

        // Update state
        setIsPremium(premium);
        setIsOnTrial(trial);
        setTrialDaysLeft(daysLeft);

        // Cache result
        subscriptionCache.set(cacheKey, {
          data: { isPremium: premium, isOnTrial: trial, trialDaysLeft: daysLeft },
          timestamp: Date.now(),
        });

      } catch (err) {
        console.error('Failed to verify user credentials with payment engine:', err);
        setError(err);
        // Fallback: No access -> Free tier
        setIsPremium(false);
        setIsOnTrial(false);
        setTrialDaysLeft(0);
      } finally {
        setLoading(false);
      }
    };

    verifyPremiumAccessRights();
  }, [user?.email, user?.role, user?.id, calculateTrialDaysLeft]);

  // Manual refresh utility
  const refresh = useCallback(() => {
    if (user?.email) {
      subscriptionCache.delete(user.email);
      setLoading(true);
    }
  }, [user?.email]);

  // Force re-check after subscription changes
  const checkAccess = useCallback(() => {
    if (user?.email) {
      subscriptionCache.delete(user.email);
      verifyPremiumAccessRights();
    }
  }, [user?.email]);

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
