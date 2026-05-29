/**
 * CLI data facade — mirrors `agentsService` RPC contracts.
 */
import type { AgentActionLogRecord } from '@lenserfight/types'
import { callRpc } from '../../utils/api'

/** Per-agent action log history (`fn_list_agent_action_logs`). */
export async function getActionLogs(
  aiLenserId: string,
  limit = 50,
): Promise<AgentActionLogRecord[]> {
  const rows = await callRpc<AgentActionLogRecord[]>(
    'fn_list_agent_action_logs',
    { p_ai_lenser_id: aiLenserId, p_limit: limit },
    { requireAuth: true },
  )
  return Array.isArray(rows) ? rows : []
}
