import { AuthExternalRedirect } from '@lenserfight/features/auth'
import { Loader } from '@lenserfight/ui/feedback'
import { ModalRoute } from '@lenserfight/ui/routing'
import { ARENA_BASE_URL } from '@lenserfight/utils/env'
import React, { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { AccountRoutes } from './routes/AccountRoutes'
import { AdminRoutes } from './routes/AdminRoutes'
import { AuthRoutes } from './routes/AuthRoutes'
import { BattleRoutes } from './routes/BattleRoutes'
import { ProfileRoutes } from './routes/ProfileRoutes'
import { WorkflowRoutes } from './routes/WorkflowRoutes'
import { DashboardFrame } from './shell/DashboardFrame'

const LazyHomePage = lazy(() =>
  import('@lenserfight/features/home').then((module) => ({ default: module.HomePage }))
)
const LazyLenserBoardPage = lazy(() =>
  import('@lenserfight/features/lenserboard').then((module) => ({ default: module.LenserBoardPage }))
)
const LazyAICatalogShowroomPage = lazy(() =>
  import('@lenserfight/features/generations').then((module) => ({
    default: module.AICatalogShowroomPage,
  }))
)
const LazyAICatalogModelDetailPage = lazy(() =>
  import('@lenserfight/features/generations').then((module) => ({
    default: module.AICatalogModelDetailPage,
  }))
)
const LazyAICatalogModelsPage = lazy(() =>
  import('@lenserfight/features/generations').then((module) => ({
    default: module.AICatalogModelsPage,
  }))
)
const LazyLensesPage = lazy(() =>
  import('@lenserfight/features/lenses').then((module) => ({ default: module.LensesPage }))
)
const LazyLensLabPage = lazy(() =>
  import('@lenserfight/features/lenses').then((module) => ({ default: module.LensLabPage }))
)
const LazyMediaGalleryPage = lazy(() =>
  import('@lenserfight/features/lenses').then((module) => ({ default: module.MediaGalleryPage }))
)
const LazyMarketplacePage = lazy(() =>
  import('@lenserfight/features/lenses').then((module) => ({ default: module.MarketplacePage }))
)
const LazyTagCloudPage = lazy(() =>
  import('@lenserfight/features/tags').then((module) => ({ default: module.TagCloudPage }))
)
const LazyTagDetailPage = lazy(() =>
  import('@lenserfight/features/tags').then((module) => ({ default: module.TagDetailPage }))
)
const LazyThreadDetailPage = lazy(() =>
  import('@lenserfight/features/threads').then((module) => ({ default: module.ThreadDetailPage }))
)
const LazyThreadComposePage = lazy(() =>
  import('@lenserfight/features/threads').then((module) => ({ default: module.ThreadComposePage }))
)
const LazySpectatorFeedWidget = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.SpectatorFeedWidget }))
)
const LazyAutomationsPage = lazy(() =>
  import('@lenserfight/features/automation').then((module) => ({ default: module.AutomationsPage }))
)
const LazyShortLinkRedirect = lazy(() =>
  import('@lenserfight/features/share').then((module) => ({ default: module.ShortLinkRedirect }))
)
const LazyCreateLenserProfileModal = lazy(() =>
  import('@lenserfight/features/onboarding').then((module) => ({
    default: module.CreateLenserProfileModal,
  }))
)
const LazyChatPage = lazy(() =>
  import('@lenserfight/features/chat').then((module) => ({ default: module.ChatPage }))
)
const LazyConnectorsPage = lazy(() =>
  import('@lenserfight/features/connectors').then((module) => ({ default: module.ConnectorsPage }))
)
const LazyNotAuthorizedPage = lazy(() =>
  import('./NotAuthorizedPage').then((module) => ({ default: module.NotAuthorizedPage }))
)

const PolicyExternalRedirect: React.FC = () => {
  const location = useLocation()
  const suffix = location.pathname.replace(/^\/policies\/?/, '')
  const policyPath = suffix ? `/policies/${suffix}` : '/policies/terms'
  return <AuthExternalRedirect to={`${ARENA_BASE_URL}${policyPath}${location.search}`} />
}

const OnboardingModal: React.FC = () => (
  <ModalRoute maxWidth="max-w-xl sm:max-w-2xl" dismissOnBackdrop={false}>
    <LazyCreateLenserProfileModal />
  </ModalRoute>
)

export const WebRouter: React.FC = () => {
  return (
    <Suspense fallback={<Loader variant="overlay" />}>
      <Routes>
        {/* Short-link redirect */}
        <Route path="/s/:shortId" element={<LazyShortLinkRedirect />} />

        {/* Auth redirects */}
        {AuthRoutes()}

        {/* Home */}
        <Route
          path="/"
          element={
            <DashboardFrame>
              <LazyHomePage
                spectatorSlot={
                  <Suspense fallback={null}>
                    <LazySpectatorFeedWidget />
                  </Suspense>
                }
              />
            </DashboardFrame>
          }
        />

        {/* External marketing / policy redirects */}
        <Route path="/about" element={<AuthExternalRedirect to={`${ARENA_BASE_URL}/about`} />} />
        <Route path="/product" element={<AuthExternalRedirect to={`${ARENA_BASE_URL}/product`} />} />
        <Route path="/faq" element={<AuthExternalRedirect to={`${ARENA_BASE_URL}/faq`} />} />
        <Route path="/terms" element={<AuthExternalRedirect to={`${ARENA_BASE_URL}/policies/terms`} />} />
        <Route path="/privacy" element={<AuthExternalRedirect to={`${ARENA_BASE_URL}/policies/privacy`} />} />
        <Route path="/cookies" element={<AuthExternalRedirect to={`${ARENA_BASE_URL}/policies/cookies`} />} />
        <Route path="/policies" element={<PolicyExternalRedirect />} />
        <Route path="/policies/*" element={<PolicyExternalRedirect />} />

        {/* Leaderboard */}
        <Route
          path="/lenserboard"
          element={
            <DashboardFrame>
              <LazyLenserBoardPage />
            </DashboardFrame>
          }
        />

        {/* AI catalog */}
        <Route
          path="/ai/catalog"
          element={
            <DashboardFrame>
              <LazyAICatalogShowroomPage />
            </DashboardFrame>
          }
        />
        <Route
          path="/ai/catalog/models"
          element={
            <DashboardFrame>
              <LazyAICatalogModelsPage />
            </DashboardFrame>
          }
        />
        <Route
          path="/ai/catalog/:providerKey/:modelKey"
          element={
            <DashboardFrame>
              <LazyAICatalogModelDetailPage />
            </DashboardFrame>
          }
        />

        {/* Threads */}
        <Route
          path="/threads/compose"
          element={
            <DashboardFrame>
              <ModalRoute accessCheck={({ isAuthenticated, hasLenser }) => isAuthenticated && hasLenser}>
                <LazyThreadComposePage />
              </ModalRoute>
            </DashboardFrame>
          }
        />
        <Route
          path="/threads/:threadId"
          element={
            <DashboardFrame>
              <LazyThreadDetailPage />
            </DashboardFrame>
          }
        />

        {/* Lenses & media */}
        <Route
          path="/lenses"
          element={
            <DashboardFrame>
              <LazyLensesPage />
            </DashboardFrame>
          }
        />
        <Route
          path="/lenses/:id"
          element={
            <DashboardFrame>
              <LazyLensLabPage />
            </DashboardFrame>
          }
        />
        <Route
          path="/marketplace"
          element={
            <DashboardFrame>
              <LazyMarketplacePage />
            </DashboardFrame>
          }
        />
        <Route
          path="/media"
          element={
            <DashboardFrame>
              <LazyMediaGalleryPage />
            </DashboardFrame>
          }
        />

        {/* Tags */}
        <Route
          path="/ray"
          element={
            <DashboardFrame>
              <LazyTagCloudPage />
            </DashboardFrame>
          }
        />
        <Route
          path="/ray/:slug"
          element={
            <DashboardFrame>
              <LazyTagDetailPage />
            </DashboardFrame>
          }
        />
        <Route
          path="/ray/:slug/:tab"
          element={
            <DashboardFrame>
              <LazyTagDetailPage />
            </DashboardFrame>
          }
        />

        {/* Chat & connectors */}
        <Route
          path="/chat"
          element={
            <DashboardFrame>
              <LazyChatPage />
            </DashboardFrame>
          }
        />
        <Route
          path="/connectors"
          element={
            <DashboardFrame>
              <LazyConnectorsPage />
            </DashboardFrame>
          }
        />
        <Route
          path="/automations"
          element={
            <DashboardFrame>
              <LazyAutomationsPage />
            </DashboardFrame>
          }
        />

        {/* Feature route groups */}
        {BattleRoutes()}
        {ProfileRoutes()}
        {WorkflowRoutes()}
        {AccountRoutes()}
        {AdminRoutes()}

        {/* Onboarding & error */}
        <Route path="/onboarding" element={<OnboardingModal />} />
        <Route
          path="/not-authorized"
          element={
            <DashboardFrame>
              <LazyNotAuthorizedPage />
            </DashboardFrame>
          }
        />

        {/* Legacy / convenience redirects */}
        <Route path="/billing" element={<Navigate to="/" replace />} />
        <Route path="/app" element={<Navigate to="/" replace />} />
        <Route path="/prompts/*" element={<Navigate to="/lenses" replace />} />
        <Route path="/tags/*" element={<Navigate to="/ray" replace />} />
        <Route path="/rays/*" element={<Navigate to="/ray" replace />} />
        <Route path="/len/*" element={<Navigate to="/ray" replace />} />
        <Route path="/leaderboard" element={<Navigate to="/lenserboard" replace />} />
        <Route path="/store" element={<Navigate to="/" replace />} />

        {/* Unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
