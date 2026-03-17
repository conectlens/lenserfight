import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAuth } from '@lenserfight/features/auth'
import { queryKeys } from '@lenserfight/data/cache'
import { analyticsService } from '@lenserfight/infra/analytics'
import { reactionService } from '@lenserfight/data/repositories'
import { threadInteractionService } from '@lenserfight/data/repositories'
import { threadsService } from '@lenserfight/data/repositories'
import { ThreadDetailViewModel } from '@lenserfight/types'
import { useAuthenticatedLenser } from './useAuthenticatedLenser'

// Immutable reply helpers
const updateReplyInTree = (replies: any[], id: string, updater: (r: any) => any): any[] => {
  return replies.map((r) => {
    if (r.id === id) return updater(r)
    if (r.replies && r.replies.length > 0) {
      return { ...r, replies: updateReplyInTree(r.replies, id, updater) }
    }
    return r
  })
}

const insertReplyInTree = (nodes: any[], newReply: any, parentId?: string): any[] => {
  if (!parentId) return [...nodes, newReply]

  return nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, replies: [...(node.replies || []), newReply] }
    }
    if (node.replies && node.replies.length > 0) {
      return { ...node, replies: insertReplyInTree(node.replies, newReply, parentId) }
    }
    return node
  })
}

// Prevent double view increments across mounts (StrictMode-safe)
const incrementedThreadViews = new Set<string>()

export const useThreadDetailController = (threadId?: string) => {
  const { lenser, isLoading: isLenserLoading } = useAuthenticatedLenser()
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  // Don't fire until we know who the viewer is — prevents a premature 401 for private threads
  const queryReady = !!threadId && (!isAuthenticated || !isLenserLoading)
  const detailKey = [...queryKeys.threads.detail(threadId || ''), { viewerId: lenser?.id }]

  //
  // 1. Aggregated Query
  //
  const {
    data: thread,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: detailKey,
    queryFn: async () => {
      if (!threadId) return null
      return threadsService.getThreadDetail(threadId, lenser?.id)
    },
    enabled: queryReady,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: (failureCount, error: any) => {
      if (error.message === '401' || error.message === '404') return false
      return failureCount < 2
    },
  })

  //
  // 2. View Increment & Analytics — single-call guarantee
  //
  useEffect(() => {
    if (!threadId) return

    if (incrementedThreadViews.has(threadId)) return

    let cancelled = false
    incrementedThreadViews.add(threadId)

    const recordView = async () => {
      try {
        // Global Analytics log
        await analyticsService.trackView('thread', threadId, {
          userId: user?.id,
          lenserId: lenser?.id,
        })
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          incrementedThreadViews.delete(threadId)
        }
      }
    }

    recordView()

    return () => {
      cancelled = true
    }
  }, [threadId, user?.id, lenser?.id])

  //
  // 3. Mutations with optimistic updates
  //

  const toggleReactionMutation = useMutation({
    mutationFn: async () => {
      if (!threadId || !lenser) throw new Error('Missing context')
      return reactionService.toggleReaction('thread', threadId, lenser.id, 'like')
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: detailKey })

      const prev = queryClient.getQueryData<ThreadDetailViewModel>(detailKey)
      if (!prev) return { prev }

      const toggled = !prev.userHasReacted

      queryClient.setQueryData(detailKey, {
        ...prev,
        userHasReacted: toggled,
        reactionCount: prev.reactionCount + (toggled ? 1 : -1),
      })

      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(detailKey, ctx.prev)
      }
    },
    onSuccess: (result) => {
      const prev = queryClient.getQueryData<ThreadDetailViewModel>(detailKey)
      if (!prev) return

      const finalHas = result.added

      queryClient.setQueryData(detailKey, {
        ...prev,
        userHasReacted: finalHas,
        // IMPORTANT: DO NOT update reactionCount here
        // optimistic already did the correct +/- one time
      })
    },
  })

  const toggleReplyReactionMutation = useMutation({
    mutationFn: async (replyId: string) => {
      if (!lenser) return
      return threadInteractionService.toggleReplyReaction(replyId, lenser.id)
    },
    onMutate: async (replyId) => {
      await queryClient.cancelQueries({ queryKey: detailKey })

      const previousThread = queryClient.getQueryData<ThreadDetailViewModel>(detailKey)

      if (previousThread) {
        const updatedReplies = updateReplyInTree(previousThread.replies, replyId, (r) => ({
          ...r,
          userHasReacted: !r.userHasReacted,
          reactionCount: r.userHasReacted ? r.reactionCount - 1 : r.reactionCount + 1,
        }))

        queryClient.setQueryData<ThreadDetailViewModel>(detailKey, {
          ...previousThread,
          replies: updatedReplies,
        })
      }

      return { previousThread }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousThread) {
        queryClient.setQueryData(detailKey, context.previousThread)
      }
    },
  })

  const addReplyMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!threadId || !lenser) throw new Error('Pre-check failed')
      return threadInteractionService.postReply(threadId, lenser.id, content, parentId)
    },
    onSuccess: (newReply, { parentId }) => {
      queryClient.setQueryData<ThreadDetailViewModel>(
        detailKey,
        (old) => {
        if (!old) return old
        return {
          ...old,
          replies: insertReplyInTree(old.replies, newReply, parentId),
        }
        }
      )
    },
  })

  //
  // 4. Return API
  //
  return {
    thread: thread || null,
    loading,
    error: queryError ? (queryError as Error).message : null,
    toggleReaction: toggleReactionMutation.mutate,
    toggleReplyReaction: toggleReplyReactionMutation.mutate,
    addReply: async (content: string, parentId?: string) =>
      addReplyMutation.mutateAsync({ content, parentId }),
  }
}
