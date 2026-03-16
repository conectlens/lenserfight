import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@lenserfight/data/cache'
import { AuthProvider, SessionBoundary } from '@lenserfight/features/auth'
import { LenserProvider } from '@lenserfight/features/profile'
import { ThemeProvider } from '@lenserfight/ui/theme'
import { AuthRouter } from '../router'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <SessionBoundary>
            <LenserProvider>
              <AuthRouter />
            </LenserProvider>
          </SessionBoundary>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
