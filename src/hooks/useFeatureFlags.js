import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { withTimeout } from '@/lib/auth-utils';
import { supabase } from '@/lib/supabaseClient';

export const featureAccessQueryKey = ['feature-access'];

export function useFeatureFlags(enabled = true) {
  const { user, isLoadingAuth } = useAuth();
  const eligible = enabled && !!user?.id && !isLoadingAuth;
  const query = useQuery({
    queryKey: [...featureAccessQueryKey, user?.id, user?.email, user?.role, user?.onboarding_complete],
    enabled: eligible,
    queryFn: async ({ signal }) => {
      const { data, error } = await withTimeout(supabase.rpc('my_feature_access').abortSignal(signal));
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error('Invalid feature access response');
      return new Map(data.map(flag => [flag.feature_key, flag]));
    },
    refetchOnWindowFocus: 'always',
    refetchOnMount: 'always',
  });

  return {
    isEnabled: key => eligible && !query.error && query.data?.get(key)?.is_enabled === true,
    getLockedMessage: key => query.data?.get(key)?.locked_message || 'This feature is currently unavailable.',
    loading: eligible && query.isPending,
    error: query.error,
    retry: query.refetch,
  };
}
