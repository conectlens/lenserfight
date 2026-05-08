import { moderationRepository } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

import type {
  ModerationDecisionRecord,
  ModerationDecisionType,
} from '@lenserfight/data/repositories'

export type ModerationStatusFilter = ModerationDecisionType | 'all'

export const moderationDecisionsQueryKey = (
  status: ModerationStatusFilter,
  limit: number
) => ['moderation-decisions', status, limit] as const

/**
 * Fetches moderation decisions for the current owner (battle creator or admin).
 * Backed by RPC `public.fn_get_moderation_decisions_for_owner`.
 */
export function useModerationDecisions(
  status: ModerationStatusFilter,
  limit: number,
  options?: { enabled?: boolean }
) {
  return useQuery<ModerationDecisionRecord[], Error>({
    queryKey: moderationDecisionsQueryKey(status, limit),
    queryFn: () => moderationRepository.getModerationDecisionsForOwner(status, limit),
    staleTime: 1000 * 30,
    enabled: options?.enabled ?? true,
  })
}
