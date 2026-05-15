import { Card } from '@lenserfight/ui/components'
import React from 'react'
import { useParams } from 'react-router-dom'

import { useAgentRouteMode } from '../hooks/useAgentRouteMode'

import { AgentWorkspaceShell } from './AgentWorkspaceShell'

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
  <Card className="p-10 text-center">
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
      Lenser not found
    </h1>
    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
      {handle ? `No Lenser with handle @${handle}.` : 'No handle provided.'}
    </p>
  </Card>
)

/**
 * /lenser/:handle/ag/* must always resolve. This dispatcher reads
 * `useAgentRouteMode(handle)` and renders the unified `AgentWorkspaceShell` —
 * one shell, one sidebar — switching content semantics by viewMode.
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
    case 'human_public':
    case 'agent_owner':
    case 'agent_public':
      return <AgentWorkspaceShell viewMode={mode.kind} profile={mode.profile} />
  }
}
