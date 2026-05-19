import { queryClient } from '@lenserfight/data/cache'
import { AuthProvider, SessionBoundary } from '@lenserfight/features/auth'
import { LenserProvider } from '@lenserfight/features/profile'
import { ShareProvider } from '@lenserfight/features/share'
import { AnalyticsProvider, RouteTracker } from '@lenserfight/infra/analytics'

import { useNotificationToast } from '@lenserfight/features/notifications'
import { ErrorProvider, ErrorClearer } from '@lenserfight/shared/error'
import { AppToaster, UpdateBanner } from '@lenserfight/ui/components'
import { ModalQueryDriven } from '@lenserfight/ui/routing'
import { ThemeProvider } from '@lenserfight/ui/theme'
import { QueryClientProvider } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import React, { Suspense, lazy } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { BrowserRouter } from 'react-router-dom'

import { LocaleProviderBridge } from './locale/LocaleProviderBridge'
import { useAppUpdate } from './update/useAppUpdate'
import { WebRouter } from './WebRouter'

const LazyAgentManageWizard = lazy(() =>
  import('@lenserfight/features/agents').then((module) => ({ default: module.AgentManageWizard }))
)

function NotificationToastBootstrap() {
  useNotificationToast()
  return null
}

function AppUpdateBanner() {
  const update = useAppUpdate()
  return <UpdateBanner {...update} />
}

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <ErrorProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <AppUpdateBanner />
              <SessionBoundary>
                <LenserProvider>
                  <LocaleProviderBridge>
                    <BrowserRouter
                      future={{
                        v7_startTransition: true,
                        v7_relativeSplatPath: true,
                      }}
                    >
                      <AnalyticsProvider>
                        <ShareProvider>
                          <RouteTracker />
                          <NotificationToastBootstrap />
                          <ErrorClearer />
                          <AppToaster />
                          <WebRouter />
                          <ModalQueryDriven
                            name="create-agent"
                            accessCheck={({ isAuthenticated, hasLenser }) =>
                              isAuthenticated && hasLenser
                            }
                            maxWidth="max-w-lg"
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
                                <LazyAgentManageWizard onDone={close} />
                              </Suspense>
                            )}
                          </ModalQueryDriven>
                        </ShareProvider>
                      </AnalyticsProvider>
                    </BrowserRouter>
                  </LocaleProviderBridge>
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
