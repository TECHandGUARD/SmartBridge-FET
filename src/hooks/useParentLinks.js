import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { withTimeout } from '@/lib/auth-utils';

export default function useParentLinks(user) {
  const client = useQueryClient();
  const key = ['parent-links', user?.id];
  const query = useQuery({ queryKey: key, enabled: !!user?.id, queryFn: async () => {
    const { data, error } = await withTimeout(supabase.rpc('get_parent_links'));
    if (error) throw error;
    return data || [];
  }});
  const mutation = useMutation({ mutationFn: /** @param {{operation: string, args: Record<string, unknown>}} input */ async ({ operation, args }) => {
    const { error } = await withTimeout(supabase.rpc(operation, args));
    if (error) throw error;
  }, onSuccess: () => client.invalidateQueries({ queryKey: key }) });
  return { links: query.data || [], loading: query.isLoading, error: query.error, refresh: query.refetch,
    busy: mutation.isPending, request: email => mutation.mutateAsync({ operation: 'request_parent_link', args: { learner_email: email } }),
    respond: (id, decision) => mutation.mutateAsync({ operation: 'respond_parent_link', args: { link_id: id, decision } }) };
}
