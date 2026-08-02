import type { RpcCaller } from './rpc-caller'
import type { AgentExportPayload } from '@lenserfight/shared/serializers'

/**
 * Composes an AgentExportPayload from `fn_get_agent_profile`, which
 * already returns `agents.v_agent_profile` — a view whose columns map
 * field-for-field onto AgentExportPayload (identity, model/tool policy,
 * quotas, performance stats).
 *
 * Deliberately does NOT call `fn_list_agent_tools` — despite the name,
 * that RPC returns `agents.tool_invocations` (a run-history log of past
 * tool calls), not tool policy/allowlist config. Per the confirmed
 * export scope, agent export is definition-only; run history is out of
 * scope.
 */
export async function composeAgentPayload(
  rpc: RpcCaller,
  aiLenserId: string,
): Promise<AgentExportPayload> {
  const row = await rpc<AgentExportPayload | null>('fn_get_agent_profile', {
    p_ai_lenser_id: aiLenserId,
  })
  if (!row) throw new Error(`Agent not found: ${aiLenserId}`)
  return row
}
