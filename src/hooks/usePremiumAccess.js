import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { withTimeout } from '@/lib/auth-utils';

// Interface state only: database policies must enforce access independently.
export default function usePremiumAccess(user) {
  const [access, setAccess] = useState({ isPremium: false, isOnTrial: false, trialDaysLeft: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true;
    setAccess({ isPremium: false, isOnTrial: false, trialDaysLeft: 0 });
    setError(null);
    if (!user?.id) { setLoading(false); return; }
    if (user.is_super_admin === true) {
      setAccess({ isPremium: true, isOnTrial: false, trialDaysLeft: 0 });
      setLoading(false); return;
    }
    setLoading(true);
    const verify = async () => {
      try {
        const { data, error: queryError } = await withTimeout(supabase.from('subscriptions')
          .select('id,status,end_date').eq('user_id', user.id).eq('plan', 'premium').eq('status', 'active')
          .gte('end_date', new Date().toISOString().slice(0, 10)).limit(1));
        if (queryError) throw queryError;
        const trialEnd = new Date(user.trial_started_at || '').getTime() + 3 * 86400000;
        const days = Number.isFinite(trialEnd) ? Math.max(0, Math.ceil((trialEnd - Date.now()) / 86400000)) : 0;
        const paid = data.length > 0 || user.is_premium === true;
        if (active) setAccess({ isPremium: paid || days > 0, isOnTrial: !paid && days > 0, trialDaysLeft: paid ? 0 : days });
      } catch (failure) { if (active) setError(failure); }
      finally { if (active) setLoading(false); }
    };
    verify();
    return () => { active = false; };
  }, [user?.id, user?.is_super_admin, user?.is_premium, user?.trial_started_at, revision]);
  return { ...access, loading, error, refresh, checkAccess: refresh };
}
