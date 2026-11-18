import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// The admin panel stores global switches and per-email exceptions in feature_toggles.
// Keep the reader aligned with that schema; do not use the obsolete override table.
export function useFeatureFlags(userEmail) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    supabase.from('feature_toggles')
      .select('feature_key,is_enabled,enabled_for_emails,disabled_for_emails,locked_message')
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        if (fetchError) { setError(fetchError); setFlags([]); }
        else setFlags(data || []);
        setLoading(false);
      }).catch(err => {
        if (!active) return;
        setError(err);
        setFlags([]);
        setLoading(false);
      });
    return () => { active = false; };
  }, [userEmail, version]);

  const normalizedEmail = typeof userEmail === 'string' ? userEmail.trim().toLowerCase() : '';
  const getFeatureStatus = useCallback(key => {
    const flag = flags.find(item => item.feature_key === key);
    const normalize = values => Array.isArray(values) ? values.map(v => String(v).trim().toLowerCase()) : [];
    const blocked = !!normalizedEmail && normalize(flag?.disabled_for_emails).includes(normalizedEmail);
    const allowed = !!normalizedEmail && normalize(flag?.enabled_for_emails).includes(normalizedEmail);
    // Explicit deny takes precedence; explicit allow overrides the global switch.
    const isEnabled = !error && !blocked && (allowed || flag?.is_enabled !== false);
    return { featureKey: key, globalEnabled: flag?.is_enabled !== false, userOverride: blocked ? 'DENY' : allowed ? 'ALLOW' : null, isEnabled, lockedMessage: flag?.locked_message || 'This feature is currently unavailable.' };
  }, [flags, normalizedEmail, error]);
  const isEnabled = useCallback(key => getFeatureStatus(key).isEnabled, [getFeatureStatus]);
  const getLockedMessage = useCallback(key => getFeatureStatus(key).lockedMessage, [getFeatureStatus]);
  const hasUserOverride = useCallback(key => getFeatureStatus(key).userOverride !== null, [getFeatureStatus]);
  const getFeatureKeys = useCallback(() => flags.map(flag => flag.feature_key), [flags]);
  const invalidateCache = useCallback(() => setVersion(v => v + 1), []);
  return { isEnabled, getLockedMessage, hasUserOverride, getFeatureKeys, getFeatureStatus, invalidateCache, loading, error, allGlobalFlags: flags, allUserOverrides: [] };
}
