import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@lenserfight/data/cache'
import { AuthProvider, SessionBoundary } from '@lenserfight/features/auth'
import { LenserProvider } from '@lenserfight/features/profile'
import { ThemeProvider } from '@lenserfight/ui/theme'
import { ErrorProvider, GlobalErrorRenderer } from '@lenserfight/shared/error'
import { AuthRouter } from '../router'

export function App() {
  return (
    <ErrorProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <SessionBoundary>
              <LenserProvider>
                <GlobalErrorRenderer>
                  <AuthRouter />
                </GlobalErrorRenderer>
              </LenserProvider>
            </SessionBoundary>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorProvider>
  )
}

export default App
