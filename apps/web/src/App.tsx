import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { HelmetProvider } from 'react-helmet-async'

import { SessionBoundary } from './components/SessionBoundary'
import { AuthProvider } from './context/AuthContext'
import { LenserProvider } from './context/LenserContext'
import { ShareProvider } from './context/ShareContext'
import { ThemeProvider } from './context/ThemeContext'
import { UIProvider } from './context/UIContext'
import { queryClient } from './lib/react-query'
import { AppRouter } from './router'

// Lazy load the particle background to improve initial bundle size
const StarBackground = React.lazy(() => import('./components/StarBackground'))

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            {/* SessionBoundary forces a full remount of inner providers on user change */}
            <SessionBoundary>
              <LenserProvider>
                <ShareProvider>
                  <UIProvider>
                    <React.Suspense fallback={null}>
                      <StarBackground />
                    </React.Suspense>
                    <div className="relative z-10">
                      <AppRouter />
                    </div>
                  </UIProvider>
                </ShareProvider>
              </LenserProvider>
            </SessionBoundary>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  )
}

export default App
