import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@lenserfight/data/cache'
import { AuthProvider, SessionBoundary } from '@lenserfight/features/auth'
import { AuthRouter } from '../router'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionBoundary>
          <AuthRouter />
        </SessionBoundary>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
