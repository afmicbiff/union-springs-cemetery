import { QueryClient } from '@tanstack/react-query';

const shouldRetryQuery = (failureCount, error) => {
	const message = String(error?.message || '');
	if (/401|403|404/.test(message)) return false;
	return failureCount < 2;
};

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60_000,
			gcTime: 30 * 60_000,
			refetchOnWindowFocus: false,
			refetchOnReconnect: false,
			retry: shouldRetryQuery,
			retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10_000),
		},
		mutations: {
			retry: 0,
		},
	},
});