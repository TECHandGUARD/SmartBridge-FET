import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 1000 * 60 * 5, // 5 minutes - data considered fresh
			gcTime: 1000 * 60 * 10, // 10 minutes - garbage collection time (React Query v5)
		},
		mutations: {
			retry: 1,
		},
	},
});
