import React from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@lenserfight/data/cache'
import { AuthProvider, AuthExternalRedirect } from '@lenserfight/features/auth'
import { ThemeProvider } from '@lenserfight/ui/theme'
import { GlobalAnalytics } from '@lenserfight/infra/analytics'
import { ScrollToTop } from '@lenserfight/ui/layout'
import { ErrorProvider, GlobalErrorRenderer, ErrorClearer } from '@lenserfight/shared/error'
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom'

import { LandLayout } from './layouts/LandLayout'
import { PolicyLayoutWrapper } from './layouts/PolicyLayoutWrapper'

import { LandHomePage } from './pages/LandHomePage'
import { WhatIsPage } from './pages/WhatIsPage'
import { ProductPage } from './pages/ProductPage'
import { MissionPage } from './pages/MissionPage'
import { GetStartedPage } from './pages/GetStartedPage'
import { DemoPage } from './pages/DemoPage'
import { PoliciesPage } from './pages/PoliciesPage'

const AUTH_APP_URL = import.meta.env.VITE_AUTH_BASE_URL ?? 'https://auth.lenserfight.com'
const APP_URL = import.meta.env.VITE_WEB_BASE_URL ?? 'https://app.lenserfight.com'

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
                v7_relativeSplatPath: true
              }}
            >
              <ScrollToTop />
              <GlobalAnalytics />
              <ErrorClearer />
              <GlobalErrorRenderer>
                <Routes>
                  {/* Auth Routes → delegated to apps/auth */}
                  <Route path="/auth/login" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/login`} />} />
                  <Route path="/auth/register" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/register`} />} />
                  <Route path="/auth/forgot-password" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/forgot-password`} />} />
                  <Route path="/auth/reset-password" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/reset-password`} />} />
                  <Route path="/auth" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/login`} />} />
                  <Route path="/auth/*" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/login`} />} />

                  {/* Marketing routes (LandLayout — always light) */}
                  <Route element={<LandLayout />}>
                    <Route index element={<LandHomePage />} />
                    <Route path="/what-is-lenserfight" element={<WhatIsPage />} />
                    <Route path="/product" element={<ProductPage />} />
                    <Route path="/mission" element={<MissionPage />} />
                    <Route path="/get-started" element={<GetStartedPage />} />
                    <Route path="/demo" element={<DemoPage />} />

                    {/* Policy routes */}
                    <Route element={<PolicyLayoutWrapper />}>
                      <Route path="/policies" element={<Navigate to="/policies/terms" replace />} />
                      <Route path="/policies/:policy" element={<PoliciesPage />} />
                    </Route>
                  </Route>

                  {/* Battle routes → redirect to unified app */}
                  <Route path="/battles/*" element={<AuthExternalRedirect to={`${APP_URL}/battles`} />} />

                  {/* Backward-compat redirects */}
                  <Route path="/login" element={<Navigate to="/auth/login" replace />} />
                  <Route path="/register" element={<Navigate to="/auth/register" replace />} />
                  <Route path="/forgot-password" element={<Navigate to="/auth/forgot-password" replace />} />
                  <Route path="/reset-password" element={<Navigate to="/auth/reset-password" replace />} />
                  <Route path="/prompts/*" element={<Navigate to="/" replace />} />
                  <Route path="/tags/*" element={<Navigate to="/" replace />} />
                  <Route path="/rays/*" element={<Navigate to="/" replace />} />
                  <Route path="/len/*" element={<Navigate to="/" replace />} />
                  <Route path="/leaderboard" element={<Navigate to="/" replace />} />
                  <Route path="/store" element={<Navigate to="/get-started" replace />} />

                  {/* Default */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </GlobalErrorRenderer>
            </BrowserRouter>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorProvider>
    </HelmetProvider>
  )
}

export default App
