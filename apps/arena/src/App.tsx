import { queryClient } from '@lenserfight/data/cache'
import { AuthProvider, AuthExternalRedirect } from '@lenserfight/features/auth'
import { AnalyticsProvider, RouteTracker } from '@lenserfight/infra/analytics'
import { ErrorProvider, GlobalErrorRenderer, ErrorClearer } from '@lenserfight/shared/error'
import {
  LocaleGuard,
  NotFoundRedirect,
  UnprefixedRedirect,
} from '@lenserfight/shared/i18n-routing'
import { ScrollToTop } from '@lenserfight/ui/layout'
import { ThemeProvider } from '@lenserfight/ui/theme'
import { QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom'

import { LandLayout } from './layouts/LandLayout'
import { PolicyLayoutWrapper } from './layouts/PolicyLayoutWrapper'
import { AboutPage } from './pages/AboutPage'
import { ChainabitContactRedirect } from './pages/ChainabitContactRedirect'
import { DemoPage } from './pages/DemoPage'
import { FAQPage } from './pages/FAQPage'
import { FounderNotePage } from './pages/FounderNotePage'
import { GetStartedPage } from './pages/GetStartedPage'
import { LandHomePage } from './pages/LandHomePage'
import { PoliciesPage } from './pages/PoliciesPage'
import { ProductPage } from './pages/ProductPage'
import { CLIPage } from './pages/CLIPage'
import { CLIQuickstartPage } from './pages/CLIQuickstartPage'
import { MobileComingSoonPage } from './pages/MobileComingSoonPage'
import { BattleShowcasePage } from './pages/BattleShowcasePage'
import { RouteSEO } from './seo/RouteSEO'

const AUTH_APP_URL = import.meta.env.AUTH_BASE_URL ?? 'https://auth.lenserfight.com'
const ARENA_APP_URL = import.meta.env.WEB_BASE_URL ?? 'https://moon.lenserfight.com'

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <ErrorProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <AnalyticsProvider>
                  <RouteSEO />
                  <ScrollToTop />
                  <RouteTracker />
                  <ErrorClearer />
                  <GlobalErrorRenderer>
                    <Routes>
                      {/* Bare-form external redirects — kept ABOVE the locale
                          tree so existing inbound links like /auth/login keep
                          working without entering LocaleGuard. */}
                      <Route path="/auth/login" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/login`} />} />
                      <Route path="/auth/register" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/register`} />} />
                      <Route path="/auth/forgot-password" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/forgot-password`} />} />
                      <Route path="/auth/reset-password" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/reset-password`} />} />
                      <Route path="/auth" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/login`} />} />
                      <Route path="/auth/*" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/login`} />} />
                      <Route path="/battles/*" element={<AuthExternalRedirect to={`${ARENA_APP_URL}/battles`} />} />
                      <Route path="/contact" element={<ChainabitContactRedirect />} />

                      {/* Localized tree */}
                      <Route path="/:lang" element={<LocaleGuard />}>
                        <Route element={<LandLayout />}>
                          <Route index element={<LandHomePage />} />
                          <Route path="about" element={<AboutPage />} />
                          <Route path="note-from-omer" element={<FounderNotePage />} />
                          <Route path="product" element={<ProductPage />} />
                          <Route path="product/cli" element={<CLIPage />} />
                          <Route path="product/cli/quickstart" element={<CLIQuickstartPage />} />
                          <Route path="product/mobile" element={<MobileComingSoonPage />} />
                          <Route path="faq" element={<FAQPage />} />
                          <Route path="get-started" element={<GetStartedPage />} />
                          <Route path="demo" element={<DemoPage />} />
                          <Route path="battle-showcase" element={<BattleShowcasePage />} />

                          <Route element={<PolicyLayoutWrapper />}>
                            <Route path="policies" element={<Navigate to="terms" replace />} />
                            <Route path="policies/:policy" element={<PoliciesPage />} />
                          </Route>
                        </Route>

                        {/* Locale-prefixed external redirects so i18n.language
                            is set before the redirect runs. */}
                        <Route path="auth" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/login`} />} />
                        <Route path="auth/*" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/login`} />} />
                        <Route path="battles/*" element={<AuthExternalRedirect to={`${ARENA_APP_URL}/battles`} />} />
                        <Route path="contact" element={<ChainabitContactRedirect />} />

                        {/* Localized backward-compat aliases */}
                        <Route path="ecosystem" element={<Navigate to="../product" replace />} />
                        <Route path="mission" element={<Navigate to="../about" replace />} />
                        <Route path="founder-note" element={<Navigate to="../note-from-omer" replace />} />
                        <Route path="what-is-lenserfight" element={<Navigate to="../about" replace />} />
                        <Route path="login" element={<Navigate to="../auth/login" replace />} />
                        <Route path="register" element={<Navigate to="../auth/register" replace />} />
                        <Route path="forgot-password" element={<Navigate to="../auth/forgot-password" replace />} />
                        <Route path="reset-password" element={<Navigate to="../auth/reset-password" replace />} />
                        <Route path="prompts/*" element={<NotFoundRedirect />} />
                        <Route path="tags/*" element={<NotFoundRedirect />} />
                        <Route path="rays/*" element={<NotFoundRedirect />} />
                        <Route path="len/*" element={<NotFoundRedirect />} />
                        <Route path="leaderboard" element={<NotFoundRedirect />} />
                        <Route path="store" element={<Navigate to="../get-started" replace />} />

                        <Route path="*" element={<NotFoundRedirect />} />
                      </Route>

                      {/* Bare paths — redirect to /<detected>/<path> */}
                      <Route path="*" element={<UnprefixedRedirect />} />
                    </Routes>
                  </GlobalErrorRenderer>
                </AnalyticsProvider>
              </BrowserRouter>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorProvider>
    </HelmetProvider>
  )
}

export default App
