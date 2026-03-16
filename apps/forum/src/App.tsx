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
import { UIProvider } from '@lenserfight/ui/components'
import { ShareProvider } from '@lenserfight/features/share'
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
import { LenserProfilePage, LenserProvider, useLenser } from '@lenserfight/features/profile'
import {
  PromptDetailPage,
  PromptsPage,
} from '@lenserfight/features/prompts'
import { WelcomePage } from '@lenserfight/features/public'
import { SettingsPage } from '@lenserfight/features/settings'
import { ShortLinkRedirect } from '@lenserfight/features/share'
import {
  TagCloudPage,
  TagDetailPage,
} from '@lenserfight/features/tags'
import { ThreadDetailPage } from '@lenserfight/features/threads'
import { WaitingListPage } from '@lenserfight/features/waiting-list'
import { useEffect } from 'react'
import { Routes, Route, Navigate, Outlet, BrowserRouter } from 'react-router-dom'

const AUTH_APP_URL = import.meta.env.VITE_AUTH_APP_URL ?? 'https://auth.lenserfight.com'

const ExternalRedirect = ({ to }: { to: string }) => {
  useEffect(() => { window.location.href = to }, [to])
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
                      <ScrollToTop />
                      <GlobalAnalytics />
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
                          path="/threads/:threadId"
                          element={
                            <DashboardLayout>
                              <ThreadDetailPage />
                            </DashboardLayout>
                          }
                        />

                        {/* Updated Route: Prompts -> /len/p */}
                        <Route
                          path="/len/p"
                          element={
                            <DashboardLayout>
                              <PromptsPage />
                            </DashboardLayout>
                          }
                        />

                        <Route
                          path="/len/p/:id"
                          element={
                            <DashboardLayout>
                              <PromptDetailPage />
                            </DashboardLayout>
                          }
                        />

                        {/* Updated Route: Tags -> /len */}
                        <Route
                          path="/len"
                          element={
                            <DashboardLayout>
                              <TagCloudPage />
                            </DashboardLayout>
                          }
                        />

                        <Route
                          path="/len/:slug"
                          element={
                            <DashboardLayout>
                              <TagDetailPage />
                            </DashboardLayout>
                          }
                        />

                        <Route
                          path="/len/:slug/:tab"
                          element={
                            <DashboardLayout>
                              <TagDetailPage />
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
                        <Route path="/prompts/*" element={<Navigate to="/len/p" replace />} />
                        <Route path="/tags/*" element={<Navigate to="/len" replace />} />
                        <Route path="/leaderboard" element={<Navigate to="/lenserboard" replace />} />

                        {/* Default Redirect */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </BrowserRouter>
                  </ShareProvider>
                </UIProvider>
              </LenserProvider>
            </SessionBoundary>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  )
}

export default App
