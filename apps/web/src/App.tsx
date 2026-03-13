import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { queryClient } from '@lenserfight/data/cache'
import {
  AuthProvider,
  SessionBoundary,
} from '@lenserfight/features/auth'
import { LenserProvider } from '@lenserfight/features/profile'
import { ShareProvider } from '@lenserfight/features/share'
import { UIProvider } from '@lenserfight/ui/components'
import { ThemeProvider } from '@lenserfight/ui/theme'

import { AppRouter } from './router'

// Lazy load the particle background to improve initial bundle size
const StarBackground = React.lazy(() =>
  import('@lenserfight/ui/components').then((module) => ({
    default: module.StarBackground,
  }))
)

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
