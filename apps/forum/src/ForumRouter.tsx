
import { Loader } from '@lenserfight/ui/feedback'
import { AuthExternalRedirect } from '@lenserfight/features/auth'
import { ShareProvider } from '@lenserfight/features/share'
import { WalletProvider } from '@lenserfight/features/store'
import { UIProvider } from '@lenserfight/ui/providers'
import { ModalRoute } from '@lenserfight/ui/routing'
import React, { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'

const AUTH_APP_URL = import.meta.env.VITE_AUTH_BASE_URL ?? 'https://auth.lenserfight.com'
const ARENA_APP_URL = import.meta.env.VITE_ARENA_URL ?? 'https://lenserfight.com'

const LazyDashboardLayout = lazy(() =>
  import('@lenserfight/features/shell').then((module) => ({ default: module.DashboardLayout }))
)
const LazyHomePage = lazy(() =>
  import('@lenserfight/features/home').then((module) => ({ default: module.HomePage }))
)
const LazyLenserBoardPage = lazy(() =>
  import('@lenserfight/features/lenserboard').then((module) => ({ default: module.LenserBoardPage }))
)
const LazyLensersPage = lazy(() =>
  import('@lenserfight/features/lensers').then((module) => ({ default: module.LensersPage }))
)
const LazyLenserProfilePage = lazy(() =>
  import('@lenserfight/features/profile').then((module) => ({ default: module.LenserProfilePage }))
)
const LazyPendingRequestsPage = lazy(() =>
  import('@lenserfight/features/profile').then((module) => ({ default: module.PendingRequestsPage }))
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
const LazySettingsPage = lazy(() =>
  import('@lenserfight/features/settings').then((module) => ({ default: module.SettingsPage }))
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
const LazyWaitingListPage = lazy(() =>
  import('@lenserfight/features/waiting-list').then((module) => ({ default: module.WaitingListPage }))
)
const LazyStorePage = lazy(() =>
  import('@lenserfight/features/store').then((module) => ({ default: module.StorePage }))
)
const LazyAgentManageWizard = lazy(() =>
  import('@lenserfight/features/agents').then((module) => ({ default: module.AgentManageWizard }))
)
const LazyAgentProfileRedirect = lazy(() =>
  import('@lenserfight/features/agents').then((module) => ({ default: module.AgentProfileRedirect }))
)
const LazyBenchmarkSuitesPage = lazy(() =>
  import('@lenserfight/features/benchmark').then((module) => ({ default: module.BenchmarkSuitesPage }))
)
const LazyBenchmarkSuiteDetailPage = lazy(() =>
  import('@lenserfight/features/benchmark').then((module) => ({
    default: module.BenchmarkSuiteDetailPage,
  }))
)
const LazyWorkflowsPage = lazy(() =>
  import('@lenserfight/features/workflows').then((module) => ({ default: module.WorkflowsPage }))
)
const LazyWorkflowBuilderPage = lazy(() =>
  import('@lenserfight/features/workflows').then((module) => ({ default: module.WorkflowBuilderPage }))
)
const LazyCreateWorkflowWizard = lazy(() =>
  import('@lenserfight/features/workflows').then((module) => ({ default: module.CreateWorkflowWizard }))
)
const LazyNotAuthorizedPage = lazy(() =>
  import('./NotAuthorizedPage').then((module) => ({ default: module.NotAuthorizedPage }))
)
const LazyShortLinkRedirect = lazy(() =>
  import('@lenserfight/features/share').then((module) => ({ default: module.ShortLinkRedirect }))
)
const LazyCreateLenserProfileModal = lazy(() =>
  import('@lenserfight/features/onboarding').then((module) => ({
    default: module.CreateLenserProfileModal,
  }))
)

const RouteFallback: React.FC = () => (
  <Loader variant="overlay" message="Loading forum..." />
)

const DashboardFrame: React.FC<{ children: React.ReactNode; fullscreen?: boolean }> = ({
  children,
  fullscreen,
}) => (
  <ShareProvider>
    <WalletProvider>
      <UIProvider>
        <LazyDashboardLayout fullscreen={fullscreen}>{children}</LazyDashboardLayout>
      </UIProvider>
    </WalletProvider>
  </ShareProvider>
)

const WorkflowsPageRoute: React.FC = () => {
  const navigate = useNavigate()
  return <LazyWorkflowsPage onCreateWorkflow={() => navigate('/workflows/manage')} />
}

const WorkflowBuilderPageRoute: React.FC = () => {
  const navigate = useNavigate()
  const { id, runId } = useParams<{ id: string; runId?: string }>()
  return (
    <LazyWorkflowBuilderPage
      workflowId={id!}
      runId={runId}
      onBattleClick={(workflowId) => window.open(`${ARENA_APP_URL}/battles/create?workflow_id=${workflowId}`, '_blank')}
    />
  )
}

const CreateWorkflowModal: React.FC = () => {
  const navigate = useNavigate()
  return (
    <ModalRoute
      accessCheck={({ isAuthenticated, hasLenser }) => isAuthenticated && hasLenser}
      maxWidth="max-w-2xl"
    >
      <LazyCreateWorkflowWizard
        onCreated={(workflowId) => navigate(`/workflows/${workflowId}`)}
        onCancel={() => navigate('/workflows')}
      />
    </ModalRoute>
  )
}

const AgentManageModal: React.FC = () => {
  const navigate = useNavigate()
  const { handle } = useParams<{ handle: string }>()
  const [searchParams] = useSearchParams()
  const agentId = searchParams.get('agentId') ?? ''

  const closeModal = () => navigate(`/lenser/${handle}`, { replace: true })

  return (
    <ModalRoute
      accessCheck={({ isAuthenticated, hasLenser }) => isAuthenticated && hasLenser}
      maxWidth="max-w-lg"
      onClose={closeModal}
    >
      <LazyAgentManageWizard agentId={agentId} handle={handle!} onDone={closeModal} />
    </ModalRoute>
  )
}

const OnboardingModal: React.FC = () => (
  <ModalRoute maxWidth="max-w-xl sm:max-w-2xl" dismissOnBackdrop={false}>
    <LazyCreateLenserProfileModal />
  </ModalRoute>
)

export const ForumRouter: React.FC = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/s/:shortId" element={<LazyShortLinkRedirect />} />
        <Route path="/auth/login" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/login`} />} />
        <Route
          path="/auth/register"
          element={<AuthExternalRedirect to={`${AUTH_APP_URL}/register`} />}
        />
        <Route
          path="/auth/forgot-password"
          element={<AuthExternalRedirect to={`${AUTH_APP_URL}/forgot-password`} />}
        />
        <Route
          path="/auth/reset-password"
          element={<AuthExternalRedirect to={`${AUTH_APP_URL}/reset-password`} />}
        />
        <Route path="/auth" element={<AuthExternalRedirect to={`${AUTH_APP_URL}/login`} />} />
        <Route
          path="/welcome"
          element={<AuthExternalRedirect to={`${ARENA_APP_URL}/get-started`} />}
        />

        <Route
          path="/"
          element={
            <DashboardFrame>
              <LazyHomePage />
            </DashboardFrame>
          }
        />

        <Route
          path="/lenserboard"
          element={
            <DashboardFrame>
              <LazyLenserBoardPage />
            </DashboardFrame>
          }
        />

        <Route
          path="/lensers"
          element={
            <DashboardFrame>
              <LazyLensersPage />
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
          path="/media"
          element={
            <DashboardFrame>
              <LazyMediaGalleryPage />
            </DashboardFrame>
          }
        />

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

        <Route
          path="/lenser/requests"
          element={
            <DashboardFrame>
              <LazyPendingRequestsPage />
            </DashboardFrame>
          }
        />

        <Route
          path="/lenser/:handle"
          element={
            <DashboardFrame>
              <LazyLenserProfilePage />
            </DashboardFrame>
          }
        >
          <Route path="agent" element={<AgentManageModal />} />
        </Route>

        <Route
          path="/lenser/:handle/:tab"
          element={
            <DashboardFrame>
              <LazyLenserProfilePage />
            </DashboardFrame>
          }
        />

        <Route path="/settings" element={<Navigate to="/settings/account" replace />} />

        <Route
          path="/settings/:tab"
          element={
            <DashboardFrame>
              <LazySettingsPage />
            </DashboardFrame>
          }
        />

        <Route
          path="/waiting-list"
          element={
            <DashboardFrame>
              <LazyWaitingListPage />
            </DashboardFrame>
          }
        />

        <Route
          path="/billing"
          element={
            <DashboardFrame>
              <LazyStorePage />
            </DashboardFrame>
          }
        />

        <Route
          path="/workflows"
          element={
            <DashboardFrame>
              <WorkflowsPageRoute />
            </DashboardFrame>
          }
        >
          <Route path="manage" element={<CreateWorkflowModal />} />
        </Route>

        <Route
          path="/workflows/:id"
          element={
            <DashboardFrame fullscreen>
              <WorkflowBuilderPageRoute />
            </DashboardFrame>
          }
        />

        <Route
          path="/workflows/:id/run/:runId"
          element={
            <DashboardFrame fullscreen>
              <WorkflowBuilderPageRoute />
            </DashboardFrame>
          }
        />

        <Route path="/agents" element={<Navigate to="/lensers?type=ai" replace />} />
        <Route path="/agents/:id" element={<LazyAgentProfileRedirect />} />

        <Route
          path="/benchmark"
          element={
            <DashboardFrame>
              <LazyBenchmarkSuitesPage />
            </DashboardFrame>
          }
        />

        <Route
          path="/benchmark/:id"
          element={
            <DashboardFrame>
              <LazyBenchmarkSuiteDetailPage />
            </DashboardFrame>
          }
        />

        <Route path="/onboarding" element={<OnboardingModal />} />

        <Route
          path="/not-authorized"
          element={
            <DashboardFrame>
              <LazyNotAuthorizedPage />
            </DashboardFrame>
          }
        />

        <Route path="/app" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route path="/register" element={<Navigate to="/auth/register" replace />} />
        <Route
          path="/forgot-password"
          element={<Navigate to="/auth/forgot-password" replace />}
        />
        <Route path="/reset-password" element={<Navigate to="/auth/reset-password" replace />} />
        <Route path="/prompts/*" element={<Navigate to="/lenses" replace />} />
        <Route path="/tags/*" element={<Navigate to="/ray" replace />} />
        <Route path="/rays/*" element={<Navigate to="/ray" replace />} />
        <Route path="/len/*" element={<Navigate to="/ray" replace />} />
        <Route path="/leaderboard" element={<Navigate to="/lenserboard" replace />} />
        <Route path="/store" element={<Navigate to="/billing" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
