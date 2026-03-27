import { queryKeys } from '@lenserfight/data/cache'
import { reactionService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

interface WorkflowReactionState {
  liked: boolean
  saved: boolean
  likeCount: number
  savedCount: number
}

export function useWorkflowReaction(
  workflowId: string,
  initialCounts?: Record<string, number> | null
) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [state, setState] = useState<WorkflowReactionState>({
    liked: false,
    saved: false,
    likeCount: initialCounts?.like ?? 0,
    savedCount: initialCounts?.saved ?? 0,
  })
  const [isPending, setIsPending] = useState(false)

  // Load the current user's reactions on mount
  useEffect(() => {
    if (!user?.id || !workflowId) return
    reactionService.getReactionSummary('workflow', workflowId, user.id).then((summary) => {
      setState((prev) => ({
        ...prev,
        liked: summary.userReactions.includes('like'),
        saved: summary.userReactions.includes('saved'),
        likeCount: summary.counts.like ?? prev.likeCount,
        savedCount: summary.counts.saved ?? prev.savedCount,
      }))
    }).catch(() => { /* silently ignore */ })
  }, [workflowId, user?.id])

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
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.detail(workflowId) })
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
