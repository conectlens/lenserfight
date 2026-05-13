
import { queryClient } from '@lenserfight/data/cache'
import { AuthProvider, SessionBoundary } from '@lenserfight/features/auth'
import { LenserProvider } from '@lenserfight/features/profile'
import { AnalyticsProvider, RouteTracker } from '@lenserfight/infra/analytics'
import { usePartnerProvisioning } from '@lenserfight/features/onboarding'
import { useNotificationToast } from '@lenserfight/features/notifications'
import { ErrorProvider, ErrorClearer } from '@lenserfight/shared/error'
import { AppToaster } from '@lenserfight/ui/components'
import { ModalQueryDriven } from '@lenserfight/ui/routing'
import { ThemeProvider } from '@lenserfight/ui/theme'
import { QueryClientProvider } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import React, { Suspense, lazy } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { BrowserRouter } from 'react-router-dom'

import { WebRouter } from './WebRouter'

const LazyCreateAgentContent = lazy(() =>
  import('@lenserfight/features/agents').then((module) => ({ default: module.CreateAgentContent }))
)

function PartnerProvisioningBootstrap() {
  usePartnerProvisioning()
  return null
}

function NotificationToastBootstrap() {
  useNotificationToast()
  return null
}

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <ErrorProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <SessionBoundary>
                <LenserProvider>
                  <BrowserRouter
                    future={{
                      v7_startTransition: true,
                      v7_relativeSplatPath: true,
                    }}
                  >
                    <AnalyticsProvider>
                      <RouteTracker />
                      <PartnerProvisioningBootstrap />
                      <NotificationToastBootstrap />
                      <ErrorClearer />
                      <AppToaster />
                      <WebRouter />
                      <ModalQueryDriven
                        name="create-agent"
                        accessCheck={({ isAuthenticated, hasLenser }) =>
                          isAuthenticated && hasLenser
                        }
                        maxWidth="max-w-md"
                        title="Create AI agent"
                        description="Give the agent a clear identity - handle and display name."
                        icon={<Sparkles size={18} />}
                      >
                        {({ close }) => (
                          <Suspense
                            fallback={
                              <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
                                Loading agent creator...
                              </div>
                            }
                          >
                            <LazyCreateAgentContent close={close} />
                          </Suspense>
                        )}
                      </ModalQueryDriven>
                    </AnalyticsProvider>
                  </BrowserRouter>
                </LenserProvider>
              </SessionBoundary>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorProvider>
    </HelmetProvider>
  )
}

export default App
