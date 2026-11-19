import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export const featureAccessQueryKey = ['feature-access'];

export function useFeatureFlags(user) {
  const { data, error, isPending } = useQuery({
    queryKey: [...featureAccessQueryKey, user?.id, user?.email],
    enabled: Boolean(user?.id),
    refetchOnWindowFocus: true,
    async queryFn({ signal }) {
      const { data, error } = await supabase.rpc('my_feature_access').abortSignal(signal);
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error('Invalid feature access response');
      return data;
    },
  });

  const getFlag = key => data?.find(flag => flag.feature_key === key);
  return {
    isEnabled: key => Boolean(user?.id && data && !error && getFlag(key)?.is_enabled !== false),
    getLockedMessage: key => getFlag(key)?.locked_message || 'This feature is currently unavailable.',
    loading: Boolean(user?.id && isPending),
    error,
  };
}
