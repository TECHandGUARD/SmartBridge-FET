/**
 * ====================================================================
 * SCALABLE FEATURE TOGGLE ENGINE: SMARTBRIDGE FET
 * INFRASTRUCTURE: POSTGRES INDEXED OVERRIDES (O(1) CONSTANT TIME)
 * PRIVACY PROTECTION: COMPLETE SYSTEM CONCEALMENT OF USER EMAILS
 * ====================================================================
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';

// In-Memory Global Configurations Cache Buffer
let cachedGlobalFlags = [];
let globalCacheTimestamp = 0;
const GLOBAL_CACHE_TTL = 300000; // 5-Minute TTL for global configurations

// Cache key for session storage (prevents re-fetch on page refresh)
const SESSION_CACHE_KEY = 'feature_flags_cache';

export function useFeatureFlags(userEmail) {
  const [globalFlags, setGlobalFlags] = useState(cachedGlobalFlags);
  const [userOverrides, setUserOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoized lookup maps for O(1) access
  const globalFlagMap = useMemo(() => {
    return new Map(globalFlags.map(f => [f.feature_key, f]));
  }, [globalFlags]);

  const userOverrideMap = useMemo(() => {
    return new Map(userOverrides.map(o => [o.feature_key, o]));
  }, [userOverrides]);

  useEffect(() => {
    const initializeFeatureContext = async () => {
      try {
        setLoading(true);
        setError(null);
        const currentTime = Date.now();

        // 1. Check session storage for cached global flags (survives page refresh)
        const sessionCache = sessionStorage.getItem(SESSION_CACHE_KEY);
        if (sessionCache) {
          try {
            const { data, timestamp } = JSON.parse(sessionCache);
            if (data.length > 0 && (currentTime - timestamp < GLOBAL_CACHE_TTL)) {
              cachedGlobalFlags = data;
              globalCacheTimestamp = timestamp;
              setGlobalFlags(data);
            }
          } catch (e) {
            // Invalid cache, ignore
          }
        }

        // 2. Fetch Global Flags (Utilize Cache if within TTL bounds)
        if (cachedGlobalFlags.length === 0 || (currentTime - globalCacheTimestamp >= GLOBAL_CACHE_TTL)) {
          const { data: toggles, error: toggleError } = await supabase
            .from('feature_toggles')
            .select('feature_key, is_enabled_globally, locked_message');

          if (toggleError) throw toggleError;
          
          cachedGlobalFlags = toggles || [];
          globalCacheTimestamp = currentTime;
          setGlobalFlags(cachedGlobalFlags);

          // Store in session storage
          try {
            sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
              data: cachedGlobalFlags,
              timestamp: globalCacheTimestamp
            }));
          } catch (e) {
            // Session storage may be full, ignore
          }
        }

        // 3. Fetch Isolated Personal Overrides (RLS ensures user can only query their own row)
        if (userEmail) {
          const { data: overrides, error: overrideError } = await supabase
            .from('feature_user_overrides')
            .select('feature_key, override_status')
            .eq('user_email', userEmail.trim().toLowerCase());

          if (overrideError) throw overrideError;
          setUserOverrides(overrides || []);
        } else {
          setUserOverrides([]);
        }

      } catch (err) {
        console.error('Critical failure synchronizing feature flags telemetry:', err);
        setError(err instanceof Error ? err : new Error('Failed to load feature flags'));
        
        // Fallback: use cached flags if available
        if (cachedGlobalFlags.length > 0) {
          setGlobalFlags(cachedGlobalFlags);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeFeatureContext();
  }, [userEmail]);

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

    return globalToggle.is_enabled_globally;
  }, [userOverrideMap, globalFlagMap]);

  const getLockedMessage = useCallback((featureKey) => {
    // Check for user-specific override message first
    const personalOverride = userOverrideMap.get(featureKey);
    if (personalOverride?.override_status === 'DENY') {
      return 'You do not have access to this feature. Please contact support.';
    }

    const globalToggle = globalFlagMap.get(featureKey);
    return globalToggle?.locked_message || 'This educational resource is currently undergoing optimization updates.';
  }, [userOverrideMap, globalFlagMap]);

  // Utility: Check if user has explicit override for a feature
  const hasUserOverride = useCallback((featureKey) => {
    return userOverrideMap.has(featureKey);
  }, [userOverrideMap]);

  // Utility: Get all available feature keys
  const getFeatureKeys = useCallback(() => {
    return Array.from(globalFlagMap.keys());
  }, [globalFlagMap]);

  return { 
    isEnabled, 
    getLockedMessage, 
    hasUserOverride,
    getFeatureKeys,
    loading,
    error,
    // Debug/Admin helpers (only populated if user is admin)
    allGlobalFlags: globalFlags,
    allUserOverrides: userOverrides,
  };
}
