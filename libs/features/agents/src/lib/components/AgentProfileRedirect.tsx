import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAgentDetail } from '../hooks/useAgentDetail'

/**
 * Resolves an agent UUID to its lenser handle and redirects to the agent
 * management modal at /lenser/:handle/agent?agentId=:id.
 *
 * Used for the /agents/:id route so that external links and sidebar navigation
 * open the correct agent management modal without knowing the handle up-front.
 */
export const AgentProfileRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: agent, isLoading, isError } = useAgentDetail(id)

  useEffect(() => {
    if (isLoading) return
    if (isError || !agent) {
      navigate('/lensers?type=ai', { replace: true })
      return
    }
    // Navigate to the agent's profile management modal
    navigate(`/lenser/${agent.handle}/agent?agentId=${agent.id}`, { replace: true })
  }, [isLoading, isError, agent, navigate])

  return null
}
