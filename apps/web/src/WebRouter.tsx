
import { Loader } from '@lenserfight/ui/feedback'
import { AuthExternalRedirect } from '@lenserfight/features/auth'
import { ShareProvider } from '@lenserfight/features/share'
import { ChainabitWalletGate } from '@lenserfight/features/store'
import { GlobalErrorRenderer } from '@lenserfight/shared/error'
import { UIProvider } from '@lenserfight/ui/providers'
import { ModalRoute } from '@lenserfight/ui/routing'
import { ARENA_BASE_URL, AUTH_BASE_URL } from '@lenserfight/utils/env'
import React, { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'

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
const LazyPendingRequestsPage = lazy(() =>
  import('@lenserfight/features/profile').then((module) => ({ default: module.PendingRequestsPage }))
)
const LazyFollowersPage = lazy(() =>
  import('@lenserfight/features/profile').then((module) => ({ default: module.FollowersPage }))
)
const LazyFollowingPage = lazy(() =>
  import('@lenserfight/features/profile').then((module) => ({ default: module.FollowingPage }))
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
const LazyThreadComposePage = lazy(() =>
  import('@lenserfight/features/threads').then((module) => ({ default: module.ThreadComposePage }))
)

const LazyAgentManageWizard = lazy(() =>
  import('@lenserfight/features/agents').then((module) => ({ default: module.AgentManageWizard }))
)
const LazyAgentProfileRedirect = lazy(() =>
  import('@lenserfight/features/agents').then((module) => ({ default: module.AgentProfileRedirect }))
)
const LazyAgentWorkspacePage = lazy(() =>
  import('@lenserfight/features/agents').then((module) => ({ default: module.AgentWorkspacePage }))
)
const LazyAgentRouteShell = lazy(() =>
  import('@lenserfight/features/agents').then((module) => ({
    default: module.AgentRouteShell,
  }))
)
const LazyBattleTemplatesPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattleTemplatesPage }))
)
const LazyBattleTemplateEditorPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattleTemplateEditorPage }))
)
const LazyBattleSeriesPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattleSeriesPage }))
)
const LazyBattlesFeedPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattlesFeedPage }))
)
// Phase BP — anon-safe discovery
const LazyBattlesDiscoveryPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattlesDiscoveryPage }))
)
const LazyArenaBattlesDiscoveryPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.ArenaBattlesDiscoveryPage }))
)
const LazySpectatorFeedWidget = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.SpectatorFeedWidget }))
)
const LazyCreateBattleWizard = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.CreateBattleWizard }))
)
const LazyBattleDetailPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattleDetailPage }))
)
const LazyBattleResultPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattleResultPage }))
)
const LazyBattleReplayPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattleReplayPage }))
)
const LazyBattleLenserboardPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.BattleLenserboardPage }))
)
const LazyNotificationsPage = lazy(() =>
  import('@lenserfight/features/notifications').then((module) => ({ default: module.NotificationsPage }))
)
const LazyWaitingListPage = lazy(() =>
  import('@lenserfight/features/waiting-list').then((module) => ({ default: module.WaitingListPage }))
)
const LazyAutomationsPage = lazy(() =>
  import('@lenserfight/features/automation').then((module) => ({ default: module.AutomationsPage }))
)
const LazyTournamentPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.TournamentPage }))
)
const LazyAdminDashboardPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.AdminDashboardPage }))
)
const LazyAdminBattlesPanelPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.AdminBattlesPanelPage }))
)
const LazyKillSwitchAdminPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.KillSwitchAdminPage }))
)
const LazyPlatformFlagsAdminPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.PlatformFlagsAdminPage }))
)
const LazyVoteAnomaliesPage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.VoteAnomaliesPage }))
)
const LazyWorkflowsPage = lazy(() =>
  import('@lenserfight/features/workflows').then((module) => ({ default: module.WorkflowsPage }))
)
const LazyWorkflowBuilderPage = lazy(() =>
  import('@lenserfight/features/workflows').then((module) => ({ default: module.WorkflowBuilderPage }))
)
const LazyWorkflowTemplateGalleryPage = lazy(() =>
  import('@lenserfight/features/workflows').then((module) => ({ default: module.WorkflowTemplateGalleryPage }))
)
const LazyCreateWorkflowWizard = lazy(() =>
  import('@lenserfight/features/workflows').then((module) => ({ default: module.CreateWorkflowWizard }))
)
const LazyWorkflowRunMediaPage = lazy(() =>
  import('@lenserfight/features/workflows').then((module) => ({ default: module.WorkflowRunMediaPage }))
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
const LazyAccountDashboardPage = lazy(() =>
  import('@lenserfight/features/account').then((module) => ({ default: module.AccountDashboardPage }))
)
const LazyDeviceListPage = lazy(() =>
  import('@lenserfight/features/devices').then((module) => ({ default: module.DeviceListPage }))
)
const LazyDeviceDetailPage = lazy(() =>
  import('@lenserfight/features/devices').then((module) => ({ default: module.DeviceDetailPage }))
)
const LazyGatewayDaemonsPage = lazy(() =>
  import('@lenserfight/features/devices').then((module) => ({ default: module.GatewayDaemonsPage }))
)
const LazyJoinBattlePage = lazy(() =>
  import('@lenserfight/features/battles').then((module) => ({ default: module.JoinBattlePage }))
)
const LazyChatPage = lazy(() =>
  import('@lenserfight/features/chat').then((module) => ({ default: module.ChatPage }))
)
const LazyConnectorsPage = lazy(() =>
  import('@lenserfight/features/connectors').then((module) => ({ default: module.ConnectorsPage }))
)


const DashboardFrame: React.FC<{ children: React.ReactNode; fullscreen?: boolean }> = ({
  children,
  fullscreen,
}) => (
  <ShareProvider>
    <ChainabitWalletGate>
      <UIProvider>
        <LazyDashboardLayout fullscreen={fullscreen}>
          <GlobalErrorRenderer>{children}</GlobalErrorRenderer>
        </LazyDashboardLayout>
      </UIProvider>
    </ChainabitWalletGate>
  </ShareProvider>
)

const PolicyExternalRedirect: React.FC = () => {
  const location = useLocation()
  const suffix = location.pathname.replace(/^\/policies\/?/, '')
  const policyPath = suffix ? `/policies/${suffix}` : '/policies/terms'
  return <AuthExternalRedirect to={`${ARENA_BASE_URL}${policyPath}${location.search}`} />
}

const WorkflowsPageRoute: React.FC = () => {
  const navigate = useNavigate()
  return <LazyWorkflowsPage onCreateWorkflow={() => navigate('/workflows/manage')} />
}

const WorkflowBuilderPageRoute: React.FC = () => {
  const { id, runId } = useParams<{ id: string; runId?: string }>()
  const navigate = useNavigate()
  return (
    <LazyWorkflowBuilderPage
      workflowId={id!}
      runId={runId}
      onBattleClick={(workflowId) => navigate(`/battles/create?workflow_id=${workflowId}`)}
    />
  )
}

const CreateWorkflowModal: React.FC = () => {
  const navigate = useNavigate()
  const close = () => navigate('/workflows')
  return (
    <ModalRoute
      accessCheck={({ isAuthenticated, hasLenser }) => isAuthenticated && hasLenser}
      maxWidth="max-w-2xl"
      onClose={close}
    >
      <LazyCreateWorkflowWizard
        onCreated={(workflowId) => navigate(`/workflows/${workflowId}`)}
        onCancel={close}
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

  if (!agentId) {
    return <Navigate to={`/lenser/${handle}`} replace />
  }

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

const AgentControlRoomOverviewRedirect: React.FC = () => {
  const { handle } = useParams<{ handle: string }>()
  return <Navigate to={`/lenser/${handle}/ag/overview`} replace />
}

const LenserAgentSectionRedirect: React.FC<{ section: string }> = ({ section }) => {
  const { handle } = useParams<{ handle: string }>()
  return <Navigate to={`/lenser/${handle}/ag/${section}`} replace />
}

const CreateBattleRoute: React.FC = () => {
  const navigate = useNavigate()
  const close = () => navigate('/battles')
  return (
    <ModalRoute
      accessCheck={({ isAuthenticated, hasLenser }) => isAuthenticated && hasLenser}
      maxWidth="max-w-3xl"
      onClose={close}
    >
      <LazyCreateBattleWizard
        onSuccess={(slug) => navigate(`/battles/${slug}`)}
        onClose={close}
      />
    </ModalRoute>
  )
}

const CreateTemplateRoute: React.FC = () => {
  const navigate = useNavigate()
  const close = () => navigate('/battles/templates')
  return (
    <ModalRoute
      accessCheck={({ isAuthenticated, hasLenser }) => isAuthenticated && hasLenser}
      maxWidth="max-w-2xl"
      onClose={close}
    >
      <LazyBattleTemplateEditorPage
        onSuccess={close}
        onClose={close}
      />
    </ModalRoute>
  )
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
        <Route path="/s/:shortId" element={<LazyShortLinkRedirect />} />
        <Route path="/auth/login" element={<AuthExternalRedirect to={`${AUTH_BASE_URL}/login`} />} />
        <Route
          path="/auth/register"
          element={<AuthExternalRedirect to={`${AUTH_BASE_URL}/register`} />}
        />
        <Route
          path="/auth/forgot-password"
          element={<AuthExternalRedirect to={`${AUTH_BASE_URL}/forgot-password`} />}
        />
        <Route
          path="/auth/reset-password"
          element={<AuthExternalRedirect to={`${AUTH_BASE_URL}/reset-password`} />}
        />
        <Route path="/auth" element={<AuthExternalRedirect to={`${AUTH_BASE_URL}/login`} />} />
        <Route
          path="/welcome"
          element={<AuthExternalRedirect to={`${ARENA_BASE_URL}/get-started`} />}
        />

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

        <Route path="/about" element={<AuthExternalRedirect to={`${ARENA_BASE_URL}/about`} />} />
        <Route path="/product" element={<AuthExternalRedirect to={`${ARENA_BASE_URL}/product`} />} />
        <Route path="/faq" element={<AuthExternalRedirect to={`${ARENA_BASE_URL}/faq`} />} />
        <Route path="/terms" element={<AuthExternalRedirect to={`${ARENA_BASE_URL}/policies/terms`} />} />
        <Route path="/privacy" element={<AuthExternalRedirect to={`${ARENA_BASE_URL}/policies/privacy`} />} />
        <Route path="/cookies" element={<AuthExternalRedirect to={`${ARENA_BASE_URL}/policies/cookies`} />} />
        <Route path="/policies" element={<PolicyExternalRedirect />} />
        <Route path="/policies/*" element={<PolicyExternalRedirect />} />

        <Route
          path="/lenserboard"
          element={
            <DashboardFrame>
              <LazyLenserBoardPage />
            </DashboardFrame>
          }
        />

            <Route
              path="/battles"
              element={
                <DashboardFrame>
                  <LazyBattlesFeedPage />
                </DashboardFrame>
              }
            />
            <Route
              path="/battles/arena"
              element={
                <DashboardFrame>
                  <LazyArenaBattlesDiscoveryPage />
                </DashboardFrame>
              }
            />
            <Route
              path="/battles/browse"
              element={
                <DashboardFrame>
                  <LazyBattlesDiscoveryPage />
                </DashboardFrame>
              }
            />
            <Route path="/battles/lenserboard" element={<LazyBattleLenserboardPage />} />
            <Route
              path="/battles/templates"
              element={
                <DashboardFrame>
                  <LazyBattleTemplatesPage />
                </DashboardFrame>
              }
            />
            <Route path="/battles/templates/new" element={<CreateTemplateRoute />} />
            <Route path="/battles/templates/:id/edit" element={<CreateTemplateRoute />} />
            <Route
              path="/battles/series/:id"
              element={
                <DashboardFrame>
                  <LazyBattleSeriesPage />
                </DashboardFrame>
              }
            />
            <Route
              path="/battles/create"
              element={
                <DashboardFrame>
                  <CreateBattleRoute />
                </DashboardFrame>
              }
            />
            <Route
              path="/battles/new"
              element={
                <DashboardFrame>
                  <CreateBattleRoute />
                </DashboardFrame>
              }
            />
            <Route path="/tournaments/:slug" element={<LazyTournamentPage />} />
            <Route path="/admin" element={<LazyAdminDashboardPage />} />
            <Route
              path="/admin/battles/moderation"
              element={
                <DashboardFrame>
                  <LazyAdminBattlesPanelPage />
                </DashboardFrame>
              }
            />
            <Route
              path="/admin/kill-switches"
              element={
                <DashboardFrame>
                  <LazyKillSwitchAdminPage />
                </DashboardFrame>
              }
            />
            <Route
              path="/admin/kill-switch"
              element={
                <DashboardFrame>
                  <LazyPlatformFlagsAdminPage />
                </DashboardFrame>
              }
            />
            <Route
              path="/admin/vote-anomalies"
              element={
                <DashboardFrame>
                  <LazyVoteAnomaliesPage />
                </DashboardFrame>
              }
            />
            <Route path="/battles/:slug" element={<LazyBattleDetailPage />} />
            <Route path="/battles/:slug/result" element={<LazyBattleResultPage />} />
            <Route
              path="/battles/:slug/replay"
              element={
                <DashboardFrame>
                  <LazyBattleReplayPage />
                </DashboardFrame>
              }
            />
            <Route
              path="/battles/:slug/join"
              element={
                <DashboardFrame>
                  <LazyJoinBattlePage />
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
          path="/lenser/:handle/followers"
          element={
            <DashboardFrame>
              <LazyFollowersPage />
            </DashboardFrame>
          }
        />

        <Route
          path="/lenser/:handle/following"
          element={
            <DashboardFrame>
              <LazyFollowingPage />
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

        <Route
          path="/lenser/:handle/ag"
          element={<AgentControlRoomOverviewRedirect />}
        />

        <Route
          path="/lenser/:handle/ag/:section"
          element={
            <DashboardFrame>
              <LazyAgentRouteShell />
            </DashboardFrame>
          }
        />

        <Route
          path="/lenser/:handle/workflows"
          element={<LenserAgentSectionRedirect section="workflows" />}
        />

        <Route
          path="/lenser/:handle/ov"
          element={<LenserAgentSectionRedirect section="overview" />}
        />

        <Route
          path="/lenser/:handle/wf"
          element={<LenserAgentSectionRedirect section="workflows" />}
        />

        <Route
          path="/lenser/:handle/lg"
          element={<LenserAgentSectionRedirect section="logs" />}
        />

        <Route
          path="/lenser/:handle/sc"
          element={<LenserAgentSectionRedirect section="schedules" />}
        />

        <Route path="/lenser/:handle/rv" element={<LenserAgentSectionRedirect section="runs" />} />
        <Route path="/lenser/:handle/ap" element={<LenserAgentSectionRedirect section="approvals" />} />
        <Route path="/lenser/:handle/me" element={<LenserAgentSectionRedirect section="memory" />} />
        <Route path="/lenser/:handle/in" element={<LenserAgentSectionRedirect section="instructions" />} />
        <Route path="/lenser/:handle/to" element={<LenserAgentSectionRedirect section="tools" />} />
        <Route path="/lenser/:handle/mo" element={<LenserAgentSectionRedirect section="models" />} />
        <Route path="/lenser/:handle/pr" element={<LenserAgentSectionRedirect section="providers" />} />
        <Route path="/lenser/:handle/by" element={<LenserAgentSectionRedirect section="byok" />} />
        <Route path="/lenser/:handle/co" element={<LenserAgentSectionRedirect section="cost" />} />
        <Route path="/lenser/:handle/st" element={<LenserAgentSectionRedirect section="settings" />} />
        <Route path="/lenser/:handle/sp" element={<LenserAgentSectionRedirect section="scratchpad" />} />
        <Route path="/lenser/:handle/tm" element={<LenserAgentSectionRedirect section="team" />} />
        <Route path="/lenser/:handle/pe" element={<LenserAgentSectionRedirect section="personality" />} />
        <Route path="/lenser/:handle/ev" element={<LenserAgentSectionRedirect section="evaluations" />} />

        <Route
          path="/notifications"
          element={
            <DashboardFrame>
              <LazyNotificationsPage />
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
          path="/automations"
          element={
            <DashboardFrame>
              <LazyAutomationsPage />
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

        <Route path="/account" element={<Navigate to="/account/dashboard" replace />} />

        <Route
          path="/account/dashboard"
          element={
            <DashboardFrame>
              <LazyAccountDashboardPage />
            </DashboardFrame>
          }
        />

        <Route
          path="/account/devices"
          element={
            <DashboardFrame>
              <LazyDeviceListPage />
            </DashboardFrame>
          }
        />

        <Route
          path="/account/devices/:id"
          element={
            <DashboardFrame>
              <LazyDeviceDetailPage />
            </DashboardFrame>
          }
        />

        <Route
          path="/settings/gateway"
          element={
            <DashboardFrame>
              <LazyGatewayDaemonsPage />
            </DashboardFrame>
          }
        />


        <Route path="/billing" element={<Navigate to="/" replace />} />

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
          path="/workflows/templates"
          element={
            <DashboardFrame>
              <LazyWorkflowTemplateGalleryPage />
            </DashboardFrame>
          }
        />

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

        <Route
          path="/workflows/:workflowId/run/:runId/media"
          element={
            <DashboardFrame>
              <LazyWorkflowRunMediaPage />
            </DashboardFrame>
          }
        />

        <Route path="/agents" element={<Navigate to="/lensers?type=ai" replace />} />
        <Route path="/agents/:id" element={<LazyAgentProfileRedirect />} />
        <Route path="/agents/:agentId/workspace" element={<LazyAgentWorkspacePage />} />

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
        <Route path="/store" element={<Navigate to="/" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
