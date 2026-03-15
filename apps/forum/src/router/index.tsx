import React from 'react'
import { GlobalAnalytics } from '@lenserfight/infra/analytics'
import {
  ScrollToTop,
} from '@lenserfight/ui/layout'
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
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
} from '@lenserfight/features/auth'
import { HomePage } from '@lenserfight/features/home'
import { LeaderboardPage } from '@lenserfight/features/leaderboard'
import { LenserProfilePage, useLenser } from '@lenserfight/features/profile'
import {
  PromptDetailPage,
  PromptsPage,
} from '@lenserfight/features/prompts'
import {
  AboutPage,
  ContactPage,
  EcosystemPage,
  LegalPage,
  WelcomePage,
} from '@lenserfight/features/public'
import { SettingsPage } from '@lenserfight/features/settings'
import { ShortLinkRedirect } from '@lenserfight/features/share'
import {
  TagCloudPage,
  TagDetailPage,
} from '@lenserfight/features/tags'
import { ThreadDetailPage } from '@lenserfight/features/threads'
import { WaitingListPage } from '@lenserfight/features/waiting-list'
import { Routes, Route, Navigate, Outlet, BrowserRouter } from 'react-router-dom'

// Admin Pages

// Protected Admin Guard
const ProtectedAdminRoute = () => {
  const { lenser, isLoading } = useLenser()

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>
  if (!lenser || !lenser.is_super_admin) return <Navigate to="/" replace />
  return <Outlet />
}

// Wrapper for public routes to apply layout
const PublicRouteWrapper = () => (
  <PublicLayout>
    <Outlet />
  </PublicLayout>
)

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >      <ScrollToTop />
      <GlobalAnalytics />
      <Routes>
        {/* Short Link Redirect Route (No Layout) */}
        <Route path="/s/:shortId" element={<ShortLinkRedirect />} />

        {/* Auth Routes (Self-contained Layouts) */}
        <Route path="/auth">
          <Route index element={<Navigate to="/auth/login" replace />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route
          path="/welcome"
          element={
            <PublicLayout>
              <WelcomePage />
            </PublicLayout>
          }
        />

        {/* Public Marketing Routes */}
        <Route element={<PublicRouteWrapper />}>
          <Route path="/about" element={<AboutPage />} />
          <Route path="/about/vision" element={<AboutPage />} />
          <Route path="/about/mission" element={<AboutPage />} />

          <Route path="/ecosystem" element={<EcosystemPage />} />
          <Route path="/ecosystem/lens" element={<EcosystemPage />} />
          <Route path="/ecosystem/lenser" element={<EcosystemPage />} />
          <Route path="/ecosystem/len" element={<EcosystemPage />} />

          <Route path="/contact" element={<ContactPage />} />

          <Route path="/legal" element={<LegalPage />} />
          <Route path="/legal/privacy" element={<LegalPage />} />
          <Route path="/legal/terms" element={<LegalPage />} />
        </Route>

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
  )
}
