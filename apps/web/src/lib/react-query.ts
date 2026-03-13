import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'

const handleAuthError = (error: any) => {
  if (error?.code === 'user_not_found' || error?.message?.includes('User from sub claim in JWT does not exist')) {
    console.warn('User not found in database (API/Mutation), redirecting to login...')
    // We use window.location.href for a hard reset of the app state and to ensure it works outside of React components
    window.location.href = '/auth/login'
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleAuthError,
  }),
  mutationCache: new MutationCache({
    onError: handleAuthError,
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes (prevents immediate refetch)
      gcTime: 1000 * 60 * 30, // Keep unused data in garbage collector for 30 mins
      retry: 1, // Retry failed requests once
      refetchOnWindowFocus: false, // Don't refetch on window focus to save bandwidth
    },
  },
})
