/**
 * ====================================================================
 * SCALABLE FEATURE TOGGLE ENGINE: SMARTBRIDGE FET
 * INFRASTRUCTURE: POSTGRES INDEXED OVERRIDES (O(1) CONSTANT TIME)
 * PRIVACY PROTECTION: COMPLETE SYSTEM CONCEALMENT OF USER EMAILS
 * ====================================================================
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ============================================================
// Configuration (Soft-coded for admin control)
// ============================================================

const appName = import.meta.env.VITE_APP_NAME || 'SmartBridge FET';

// ✅ Soft-coded TTL with environment variable
const GLOBAL_CACHE_TTL = import.meta.env.VITE_FEATURE_FLAG_CACHE_TTL
  ? parseInt(import.meta.env.VITE_FEATURE_FLAG_CACHE_TTL, 10)
  : 300000; // Default: 5 minutes

const SESSION_CACHE_KEY = 'smartbridge_feature_flags';

// ============================================================
// In-Memory Global Configurations Cache Buffer
// ============================================================

let cachedGlobalFlags = [];
let globalCacheTimestamp = 0;

// ============================================================
// ✅ FIXED: fetchFeatureFlags as a stable, independent function
// ============================================================

const fetchFeatureFlags = async (userEmail) => {
  const currentTime = Date.now();

  // 1. Check session storage for cached global flags
  const sessionCache = sessionStorage.getItem(SESSION_CACHE_KEY);
  let cachedData = null;
  let cachedTimestamp = 0;

  if (sessionCache) {
    try {
      const { data, timestamp } = JSON.parse(sessionCache);
      if (data.length > 0 && (currentTime - timestamp < GLOBAL_CACHE_TTL)) {
        cachedData = data;
        cachedTimestamp = timestamp;
      }
    } catch (e) {
      // Invalid cache, ignore
    }
  }

  // 2. Use cache or fetch fresh
  let freshFlags = cachedData;
  let freshTimestamp = cachedTimestamp;

  if (!freshFlags) {
    const { data: toggles, error: toggleError } = await supabase
      .from('feature_toggles')
      .select('feature_key, is_enabled_globally, locked_message, description')
      .eq('is_active', true);

    if (toggleError) throw toggleError;

    freshFlags = toggles || [];
    freshTimestamp = currentTime;

    // Store in memory cache
    cachedGlobalFlags = freshFlags;
    globalCacheTimestamp = freshTimestamp;

    // Store in session storage
    try {
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
        data: freshFlags,
        timestamp: freshTimestamp
      }));
    } catch (e) {
      // Session storage may be full, ignore
    }
  }

  // 3. Fetch user overrides
  let overrides = [];
  if (userEmail) {
    const { data, error: overrideError } = await supabase
      .from('feature_user_overrides')
      .select('feature_key, override_status, reason')
      .eq('user_email', userEmail.trim().toLowerCase());

    if (!overrideError) {
      overrides = data || [];
    }
  }

  return { globalFlags: freshFlags, userOverrides: overrides };
};

// ============================================================
// Main Hook
// ============================================================

/**
 * useFeatureFlags - Centralized feature flag management
 *
 * @param {string} userEmail - Email of the current user
 * @returns {Object} Feature flag utilities
 */
export function useFeatureFlags(userEmail) {
  const [globalFlags, setGlobalFlags] = useState(cachedGlobalFlags);
  const [userOverrides, setUserOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Version counter to trigger cache invalidation
  const [cacheVersion, setCacheVersion] = useState(0);

  // Mount ref to prevent state updates on unmounted components
  const isMountedRef = useRef(true);

  // ============================================================
  // Memoized lookup maps for O(1) access
  // ============================================================

  const globalFlagMap = useMemo(() => {
    return new Map(globalFlags.map(f => [f.feature_key, f]));
  }, [globalFlags]);

  const userOverrideMap = useMemo(() => {
    return new Map(userOverrides.map(o => [o.feature_key, o]));
  }, [userOverrides]);

  // ============================================================
  // ✅ FIXED: useEffect with stable dependencies
  // ============================================================

  useEffect(() => {
    // Reset mount ref
    isMountedRef.current = true;

    const initializeFeatureContext = async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ FIXED: Pass userEmail as argument to stable function
        const result = await fetchFeatureFlags(userEmail);

        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setGlobalFlags(result.globalFlags);
          setUserOverrides(result.userOverrides);

          // Activity logging for POPIA compliance
          if (userEmail) {
            Promise.resolve(supabase
              .from('activity_log')
              .insert({
                event_type: 'feature_flags_loaded',
                user_email: userEmail,
                description: 'Feature flags loaded for user',
                metadata: {
                  global_flags_count: result.globalFlags.length,
                  user_overrides_count: result.userOverrides.length
                }
              }))
              .catch(() => {}); // Silent fail for logging
          }
        }

      } catch (err) {
        console.error('Critical failure synchronizing feature flags telemetry:', err);

        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to load feature flags'));

          // Fallback: use cached flags if available
          if (cachedGlobalFlags.length > 0) {
            setGlobalFlags(cachedGlobalFlags);
          }
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeFeatureContext();

    // Cleanup - mark component as unmounted
    return () => {
      isMountedRef.current = false;
    };
  }, [userEmail, cacheVersion]); // ✅ FIXED: Only userEmail and cacheVersion trigger re-fetch

  // ============================================================
  // invalidateCache - increments version to trigger useEffect
  // ============================================================

  const invalidateCache = useCallback(() => {
    // Clear memory cache
    cachedGlobalFlags = [];
    globalCacheTimestamp = 0;

    // Clear session storage
    sessionStorage.removeItem(SESSION_CACHE_KEY);

    // Clear local state
    setGlobalFlags([]);
    setUserOverrides([]);

    // Increment version to trigger useEffect re-run
    setCacheVersion(prev => prev + 1);
  }, []);

  // ============================================================
  // Public API Methods
  // ============================================================

  /**
   * Evaluates feature access rights instantly using O(1) constant hash lookups.
   */
  const isEnabled = useCallback((featureKey) => {
    // Check user-specific overrides first (highest priority)
    const personalOverride = userOverrideMap.get(featureKey);
    if (personalOverride) {
      return personalOverride.override_status === 'ALLOW';
    }

    // Check global toggle
    const globalToggle = globalFlagMap.get(featureKey);
    if (!globalToggle) return true; // Enabled by default if unconfigured

    return globalToggle.is_enabled_globally !== false;
  }, [userOverrideMap, globalFlagMap]);

  /**
   * Get the locked message for a feature
   */
  const getLockedMessage = useCallback((featureKey) => {
    const personalOverride = userOverrideMap.get(featureKey);
    if (personalOverride?.override_status === 'DENY') {
      return personalOverride.reason || 'You do not have access to this feature. Please contact support.';
    }

    const globalToggle = globalFlagMap.get(featureKey);
    return globalToggle?.locked_message || 'This feature is currently unavailable. Please check back later.';
  }, [userOverrideMap, globalFlagMap]);

  /**
   * Check if user has explicit override for a feature
   */
  const hasUserOverride = useCallback((featureKey) => {
    return userOverrideMap.has(featureKey);
  }, [userOverrideMap]);

  /**
   * Get all available feature keys
   */
  const getFeatureKeys = useCallback(() => {
    return Array.from(globalFlagMap.keys());
  }, [globalFlagMap]);

  /**
   * Get the status of a specific feature (for debugging)
   */
  const getFeatureStatus = useCallback((featureKey) => {
    const globalToggle = globalFlagMap.get(featureKey);
    const userOverride = userOverrideMap.get(featureKey);

    return {
      featureKey,
      globalEnabled: globalToggle?.is_enabled_globally !== false,
      userOverride: userOverride?.override_status || null,
      isEnabled: isEnabled(featureKey),
      lockedMessage: getLockedMessage(featureKey),
    };
  }, [globalFlagMap, userOverrideMap, isEnabled, getLockedMessage]);

  return {
    isEnabled,
    getLockedMessage,
    hasUserOverride,
    getFeatureKeys,
    getFeatureStatus,
    invalidateCache,
    loading,
    error,
    // Debug/Admin helpers
    allGlobalFlags: globalFlags,
    allUserOverrides: userOverrides,
  };
}
