import { reactionService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface WorkflowReactionState {
  liked: boolean
  saved: boolean
  likeCount: number
  savedCount: number
}

export function useWorkflowReaction(
  workflowId: string,
  initialCounts?: Record<string, number> | null,
  initialViewerReactions?: Record<string, boolean> | null,
  /** Pass true while the workflow bootstrap query is still loading. */
  bootstrapIsLoading?: boolean,
) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [state, setState] = useState<WorkflowReactionState>({
    liked: !!initialViewerReactions?.like,
    saved: !!initialViewerReactions?.saved,
    likeCount: initialCounts?.like ?? 0,
    savedCount: initialCounts?.saved ?? 0,
  })
  const [isPending, setIsPending] = useState(false)

  // If bootstrap already supplied viewer_reactions, skip the redundant
  // fn_get_entity_reaction_counts + fn_get_entity_reaction_status round trip.
  // Also wait until bootstrap has settled — if we fire before it loads we'd make
  // a separate network round trip and then immediately discard the result.
  const bootstrapSettled = bootstrapIsLoading === false || bootstrapIsLoading === undefined
  const hasBootstrapReactions = bootstrapSettled && initialViewerReactions !== undefined && initialViewerReactions !== null

  const { data: summary } = useQuery({
    queryKey: ['workflow-reaction-summary', workflowId, user?.id],
    queryFn: () => reactionService.getReactionSummary('workflow', workflowId, user?.id ?? ''),
    enabled: !!user?.id && !!workflowId && bootstrapSettled && !hasBootstrapReactions,
    staleTime: 1000 * 60,
  })

  useEffect(() => {
    if (!summary) return
    setState((prev) => ({
      ...prev,
      liked: summary.userReactions.includes('like'),
      saved: summary.userReactions.includes('saved'),
      likeCount: summary.counts.like ?? prev.likeCount,
      savedCount: summary.counts.saved ?? prev.savedCount,
    }))
  }, [summary])

  const toggle = useCallback(async (reaction: 'like' | 'saved') => {
    if (!user?.id || isPending) return
    setIsPending(true)

    // Optimistic update
    setState((prev) => {
      const isCurrentlyActive = reaction === 'like' ? prev.liked : prev.saved
      const delta = isCurrentlyActive ? -1 : 1
      return {
        ...prev,
        liked:     reaction === 'like'  ? !prev.liked  : prev.liked,
        saved:     reaction === 'saved' ? !prev.saved  : prev.saved,
        likeCount: reaction === 'like'  ? Math.max(0, prev.likeCount  + delta) : prev.likeCount,
        savedCount: reaction === 'saved' ? Math.max(0, prev.savedCount + delta) : prev.savedCount,
      }
    })

    try {
      const result = await reactionService.toggleReaction('workflow', workflowId, user.id, reaction)
      setState((prev) => ({
        ...prev,
        liked:     result.summary.userReactions.includes('like'),
        saved:     result.summary.userReactions.includes('saved'),
        likeCount: result.summary.counts.like  ?? prev.likeCount,
        savedCount: result.summary.counts.saved ?? prev.savedCount,
      }))
      queryClient.invalidateQueries({ queryKey: ['workflows', 'detail', workflowId] })
    } catch {
      // Revert optimistic update on error
      setState((prev) => {
        const delta = reaction === 'like'
          ? (prev.liked  ? 1 : -1)
          : (prev.saved ? 1 : -1)
        return {
          ...prev,
          liked:     reaction === 'like'  ? !prev.liked  : prev.liked,
          saved:     reaction === 'saved' ? !prev.saved  : prev.saved,
          likeCount: reaction === 'like'  ? Math.max(0, prev.likeCount  + delta) : prev.likeCount,
          savedCount: reaction === 'saved' ? Math.max(0, prev.savedCount + delta) : prev.savedCount,
        }
      })
    } finally {
      setIsPending(false)
    }
  }, [workflowId, user?.id, isPending, queryClient])

  return {
    ...state,
    toggleLike:  () => toggle('like'),
    toggleSave:  () => toggle('saved'),
    isPending,
    isAuthenticated: !!user,
  }
}
