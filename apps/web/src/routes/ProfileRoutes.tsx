import { ModalRoute } from '@lenserfight/ui/routing'
import React, { lazy } from 'react'
import { Navigate, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { DashboardFrame } from '../shell/DashboardFrame'

const LazyLensersPage = lazy(() =>
  import('@lenserfight/features/lensers').then((module) => ({ default: module.LensersPage }))
)
const LazyLenserProfilePage = lazy(() =>
  import('@lenserfight/features/profile').then((module) => ({ default: module.LenserProfilePage }))
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
  import('@lenserfight/features/agents').then((module) => ({ default: module.AgentRouteShell }))
)

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

export const ProfileRoutes: React.FC = () => (
  <>
    <Route
      path="/lensers"
      element={
        <DashboardFrame>
          <LazyLensersPage />
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

    {/* Short aliases for agent control room sections */}
    <Route path="/lenser/:handle/workflows" element={<LenserAgentSectionRedirect section="workflows" />} />
    <Route path="/lenser/:handle/ov" element={<LenserAgentSectionRedirect section="overview" />} />
    <Route path="/lenser/:handle/wf" element={<LenserAgentSectionRedirect section="workflows" />} />
    <Route path="/lenser/:handle/lg" element={<LenserAgentSectionRedirect section="logs" />} />
    <Route path="/lenser/:handle/sc" element={<LenserAgentSectionRedirect section="schedules" />} />
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

    {/* Agent workspace (legacy /agents path) */}
    <Route path="/agents" element={<Navigate to="/lensers?type=ai" replace />} />
    <Route path="/agents/:id" element={<LazyAgentProfileRedirect />} />
    <Route path="/agents/:agentId/workspace" element={<LazyAgentWorkspacePage />} />
  </>
)
