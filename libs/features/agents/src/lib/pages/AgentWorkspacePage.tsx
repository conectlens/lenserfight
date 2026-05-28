import React from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { useAgentDetail } from '../hooks/useAgentDetail'

export function AgentWorkspacePage() {
  const { agentId } = useParams<{ agentId: string }>()
  const { data: agent, isLoading } = useAgentDetail(agentId)

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        Redirecting to the agent control room…
      </div>
    )
  }

  if (!agent?.handle) {
    return <Navigate to="/lensers?type=ai" replace />
  }

  return <Navigate to={`/lenser/${agent.handle}/ag/overview`} replace />
}
