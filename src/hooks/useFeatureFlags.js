import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// The server resolves the current user's email against admin-managed overrides.
// The browser never receives other users' allow/deny email lists.
export function useFeatureFlags(userEmail) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    supabase.rpc('my_feature_access')
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

  const getFeatureStatus = useCallback(key => {
    const flag = flags.find(item => item.feature_key === key);
    // A missing flag is unconfigured (enabled by default); fetch errors fail closed.
    return { featureKey: key, globalEnabled: null, userOverride: null,
      isEnabled: !error && flag?.is_enabled !== false,
      lockedMessage: flag?.locked_message || 'This feature is currently unavailable.' };
  }, [flags, error]);
  const isEnabled = useCallback(key => getFeatureStatus(key).isEnabled, [getFeatureStatus]);
  const getLockedMessage = useCallback(key => getFeatureStatus(key).lockedMessage, [getFeatureStatus]);
  const hasUserOverride = useCallback(key => getFeatureStatus(key).userOverride !== null, [getFeatureStatus]);
  const getFeatureKeys = useCallback(() => flags.map(flag => flag.feature_key), [flags]);
  const invalidateCache = useCallback(() => setVersion(v => v + 1), []);
  return { isEnabled, getLockedMessage, hasUserOverride, getFeatureKeys, getFeatureStatus, invalidateCache, loading, error, allGlobalFlags: flags, allUserOverrides: [] };
}
