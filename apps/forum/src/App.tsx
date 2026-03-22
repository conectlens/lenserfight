import React from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@lenserfight/data/cache'
import { AuthProvider, SessionBoundary } from '@lenserfight/features/auth'
import { GlobalAnalytics } from '@lenserfight/infra/analytics'
import {
  ScrollToTop,
} from '@lenserfight/ui/layout'
import { ThemeProvider } from '@lenserfight/ui/theme'
import { UIProvider, AppToaster } from '@lenserfight/ui/components'
import { ShareProvider } from '@lenserfight/features/share'
import { ErrorProvider, GlobalErrorRenderer, ErrorClearer } from '@lenserfight/shared/error'
import {
  DashboardLayout,
  PublicLayout,
} from '@lenserfight/features/shell'
import {
  AdminAnalytics,
  AdminContacts,
  AdminDesign,
  AdminFeedbacks,
  AdminLayout,
  AdminUsers,
  AdminWaitlist,
  AdminWelcome,
} from '@lenserfight/features/admin'

import { HomePage } from '@lenserfight/features/home'
import { LeaderboardPage } from '@lenserfight/features/leaderboard'
import { LensersPage } from '@lenserfight/features/lensers'
import { LenserProfilePage, LenserProvider, useLenser, PendingRequestsPage } from '@lenserfight/features/profile'
import {
  LensLabPage,
  LensesPage,
} from '@lenserfight/features/lenses'
import { WelcomePage } from '@lenserfight/features/public'
import { SettingsPage } from '@lenserfight/features/settings'
import { ShortLinkRedirect } from '@lenserfight/features/share'
import {
  TagCloudPage,
  TagDetailPage,
} from '@lenserfight/features/tags'
import { ThreadDetailPage } from '@lenserfight/features/threads'
import { WaitingListPage } from '@lenserfight/features/waiting-list'
import { StorePage, WalletProvider } from '@lenserfight/features/store'
import { useEffect } from 'react'
import { Routes, Route, Navigate, Outlet, BrowserRouter, useLocation } from 'react-router-dom'

const AUTH_APP_URL = import.meta.env.VITE_AUTH_APP_URL ?? 'https://auth.lenserfight.com'

/**
 * Redirect to an external URL (auth app), preserving the current page as
 * return_url so the user is sent back here after authentication completes.
 */
const ExternalRedirect = ({ to }: { to: string }) => {
  const location = useLocation()
  useEffect(() => {
    // Avoid encoding /auth/* paths as return_url — they get rejected by sanitizeReturnUrl
    // and cause a fallback to the wrong (production) URL in dev.
    const isAuthPath = location.pathname.startsWith('/auth/')
    const returnPath = isAuthPath ? '/' : location.pathname + location.search + location.hash
    const returnUrl = encodeURIComponent(window.location.origin + returnPath)
    window.location.href = `${to}?return_url=${returnUrl}`
  }, [to, location])
  return null
}

// Protected Admin Guard
const ProtectedAdminRoute = () => {
  const { lenser, isLoading } = useLenser()

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>
  if (!lenser || !lenser.is_super_admin) return <Navigate to="/" replace />
  return <Outlet />
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
                  <UIProvider>
                    <ShareProvider>
                      <BrowserRouter
                        future={{
                          v7_startTransition: true,
                          v7_relativeSplatPath: true
                        }}
                      >
                        <WalletProvider>
                        <ScrollToTop />
                        <GlobalAnalytics />
                        <ErrorClearer />
                        <AppToaster />
                        <GlobalErrorRenderer>
                        <Routes>
                        {/* Short Link Redirect Route (No Layout) */}
                        <Route path="/s/:shortId" element={<ShortLinkRedirect />} />

                        {/* Auth Routes → delegated to apps/auth */}
                        <Route path="/auth/login" element={<ExternalRedirect to={`${AUTH_APP_URL}/login`} />} />
                        <Route path="/auth/register" element={<ExternalRedirect to={`${AUTH_APP_URL}/register`} />} />
                        <Route path="/auth/forgot-password" element={<ExternalRedirect to={`${AUTH_APP_URL}/forgot-password`} />} />
                        <Route path="/auth/reset-password" element={<ExternalRedirect to={`${AUTH_APP_URL}/reset-password`} />} />
                        <Route path="/auth" element={<ExternalRedirect to={`${AUTH_APP_URL}/login`} />} />
                        <Route
                          path="/welcome"
                          element={
                            <PublicLayout>
                              <WelcomePage />
                            </PublicLayout>
                          }
                        />

                        {/* App Dashboard Routes */}
                        <Route
                          path="/"
                          element={
                            <DashboardLayout>
                              <HomePage />
                            </DashboardLayout>
                          }
                        />

                        <Route
                          path="/lenserboard"
                          element={
                            <DashboardLayout>
                              <LeaderboardPage />
                            </DashboardLayout>
                          }
                        />

                        <Route
                          path="/lensers"
                          element={
                            <DashboardLayout>
                              <LensersPage />
                            </DashboardLayout>
                          }
                        />

                        <Route
                          path="/threads/:threadId"
                          element={
                            <DashboardLayout>
                              <ThreadDetailPage />
                            </DashboardLayout>
                          }
                        />

                        {/* Lenses Routes */}
                        <Route
                          path="/lenses"
                          element={
                            <DashboardLayout>
                              <LensesPage />
                            </DashboardLayout>
                          }
                        />

                        <Route
                          path="/lenses/:id"
                          element={
                            <DashboardLayout>
                              <LensLabPage />
                            </DashboardLayout>
                          }
                        />

                        {/* Rays (Tag Cloud) Routes */}
                        <Route
                          path="/rays"
                          element={
                            <DashboardLayout>
                              <TagCloudPage />
                            </DashboardLayout>
                          }
                        />

                        <Route
                          path="/rays/:slug"
                          element={
                            <DashboardLayout>
                              <TagDetailPage />
                            </DashboardLayout>
                          }
                        />

                        <Route
                          path="/rays/:slug/:tab"
                          element={
                            <DashboardLayout>
                              <TagDetailPage />
                            </DashboardLayout>
                          }
                        />

                        <Route
                          path="/lenser/requests"
                          element={
                            <DashboardLayout>
                              <PendingRequestsPage />
                            </DashboardLayout>
                          }
                        />

                        <Route
                          path="/lenser/:handle"
                          element={
                            <DashboardLayout>
                              <LenserProfilePage />
                            </DashboardLayout>
                          }
                        />
                        <Route
                          path="/lenser/:handle/:tab"
                          element={
                            <DashboardLayout>
                              <LenserProfilePage />
                            </DashboardLayout>
                          }
                        />

                        {/* Settings Routes with Redirect */}
                        <Route path="/settings" element={<Navigate to="/settings/account" replace />} />
                        <Route
                          path="/settings/:tab"
                          element={
                            <DashboardLayout>
                              <SettingsPage />
                            </DashboardLayout>
                          }
                        />

                        <Route
                          path="/waiting-list"
                          element={
                            <DashboardLayout>
                              <WaitingListPage />
                            </DashboardLayout>
                          }
                        />

                        <Route
                          path="/billing"
                          element={
                            <DashboardLayout>
                              <StorePage />
                            </DashboardLayout>
                          }
                        />

                        {/* ADMIN ROUTES */}
                        <Route element={<ProtectedAdminRoute />}>
                          <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<AdminWelcome />} />
                            <Route path="analytics" element={<AdminAnalytics />} />
                            <Route path="users" element={<AdminUsers />} />
                            <Route path="design" element={<AdminDesign />} />
                            <Route path="feedbacks" element={<AdminFeedbacks />} />
                            <Route path="waitlist" element={<AdminWaitlist />} />
                            <Route path="contacts" element={<AdminContacts />} />
                          </Route>
                        </Route>

                        {/* Redirect old routes for backward compatibility/bookmarks */}
                        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
                        <Route path="/register" element={<Navigate to="/auth/register" replace />} />
                        <Route path="/forgot-password" element={<Navigate to="/auth/forgot-password" replace />} />
                        <Route path="/reset-password" element={<Navigate to="/auth/reset-password" replace />} />
                        <Route path="/prompts/*" element={<Navigate to="/lenses" replace />} />
                        <Route path="/tags/*" element={<Navigate to="/rays" replace />} />
                        <Route path="/leaderboard" element={<Navigate to="/lenserboard" replace />} />
                        <Route path="/store" element={<Navigate to="/billing" replace />} />

                        {/* Default Redirect */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                        </GlobalErrorRenderer>
                        </WalletProvider>
                      </BrowserRouter>
                    </ShareProvider>
                  </UIProvider>
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
