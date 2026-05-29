/**
 * CLI data facade — mirrors `agentWorkspaceService.getHumanActivityFeed`.
 * Uses public RPCs instead of direct reads on the non-exposed `agents` schema.
 */
import type { CrossAgentFeedItem } from '@lenserfight/types'
import { callRpc } from '../../utils/api'
import { getActiveLenserProfileId } from './lenser'

/** Owner-scoped cross-agent activity feed (`fn_get_human_activity_feed`). */
export async function getHumanActivityFeed(
  limit = 50,
  offset = 0,
): Promise<CrossAgentFeedItem[]> {
  const humanLenserId = await getActiveLenserProfileId()
  if (!humanLenserId) return []

  const rows = await callRpc<CrossAgentFeedItem[]>(
    'fn_get_human_activity_feed',
    { p_human_lenser_id: humanLenserId, p_limit: limit, p_offset: offset },
    { requireAuth: true },
  )
  return Array.isArray(rows) ? rows : []
}
