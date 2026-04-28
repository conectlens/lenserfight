import React, { Suspense, lazy } from 'react'
import { useParams } from 'react-router-dom'
import { useAgentRouteMode } from '../hooks/useAgentRouteMode'
import { HumanAgentsOverviewPage } from '../pages/HumanAgentsOverviewPage'
import { HumanAgentsPublicOverviewPage } from '../pages/HumanAgentsPublicOverviewPage'
import { AgentPublicOverviewPage } from '../pages/AgentPublicOverviewPage'

const LazyAgentControlRoomPage = lazy(() =>
  import('../pages/AgentControlRoomPage').then((m) => ({
    default: m.AgentControlRoomPage,
  }))
)

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4 py-10">
    <div className="h-32 animate-pulse rounded-3xl bg-gray-100 dark:bg-gray-900" />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-900"
        />
      ))}
    </div>
  </div>
)

const NotFound: React.FC<{ handle: string }> = ({ handle }) => (
  <div className="rounded-[28px] border border-dashed border-gray-300 bg-white/80 p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
      Lenser not found
    </h1>
    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
      {handle ? `No Lenser with handle @${handle}.` : 'No handle provided.'}
    </p>
  </div>
)

/**
 * The non-negotiable rule: /lenser/:handle/ag/* must always resolve.
 * This dispatcher reads `useAgentRouteMode(handle)` and renders one of five
 * components. It never redirects, never blocks on empty collections.
 *
 * Spec: docs/connected-lenses/frontend-integration.md#route-resolution-contract
 */
export const AgentRouteShell: React.FC = () => {
  const { handle } = useParams<{ handle: string }>()
  const mode = useAgentRouteMode(handle)

  switch (mode.kind) {
    case 'loading':
      return <LoadingSkeleton />
    case 'not_found':
      return <NotFound handle={mode.handle} />
    case 'human_owner':
      return <HumanAgentsOverviewPage profile={mode.profile} />
    case 'human_public':
      return <HumanAgentsPublicOverviewPage profile={mode.profile} />
    case 'agent_owner':
      return (
        <Suspense fallback={<LoadingSkeleton />}>
          <LazyAgentControlRoomPage />
        </Suspense>
      )
    case 'agent_public':
      return <AgentPublicOverviewPage profile={mode.profile} />
  }
}
