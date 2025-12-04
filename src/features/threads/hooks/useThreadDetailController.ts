
import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { threadsService } from '../../../services/threadsService';
import { threadInteractionService } from '../../../services/threadInteractionService';
import { ThreadDetailViewModel } from '../../../types/threads.types';
import { useLenser } from '../../../context/LenserContext';
import { keys } from '../../../hooks/useThreads';

// Helper to update reply tree immutably
const updateReplyInTree = (replies: any[], id: string, updater: (r: any) => any): any[] => {
    return replies.map(r => {
        if (r.id === id) return updater(r);
        if (r.replies && r.replies.length > 0) {
            return { ...r, replies: updateReplyInTree(r.replies, id, updater) };
        }
        return r;
    });
};

const insertReplyInTree = (nodes: any[], newReply: any, parentId?: string): any[] => {
    if (!parentId) return [...nodes, newReply];
    
    return nodes.map(node => {
        if (node.id === parentId) {
            return { ...node, replies: [...(node.replies || []), newReply] };
        }
        if (node.replies && node.replies.length > 0) {
            return { ...node, replies: insertReplyInTree(node.replies, newReply, parentId) };
        }
        return node;
    });
};

export const useThreadDetailController = (threadId?: string) => {
  const { lenser } = useLenser();
  const queryClient = useQueryClient();
  const viewRecordedRef = useRef(false);

  // 1. Aggregated Query: Fetches Thread + Author + Replies + Reactions in one unified operation
  const { data: thread, isLoading: loading, error: queryError } = useQuery({
    queryKey: keys.threads.detail(threadId || ''),
    queryFn: async () => {
      if (!threadId) return null;
      return threadsService.getThreadDetail(threadId, lenser?.id);
    },
    enabled: !!threadId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,
    retry: (failureCount, error: any) => {
        // Don't retry on 401/404
        if (error.message === '401' || error.message === '404') return false;
        return failureCount < 2;
    }
  });

  // 2. Page View Logic: Runs exactly once per threadId mount
  useEffect(() => {
    if (threadId && !viewRecordedRef.current) {
        threadsService.incrementView(threadId).catch(console.error);
        viewRecordedRef.current = true;
    }
    // Reset ref if threadId changes (navigation)
    return () => {
        if (threadId) viewRecordedRef.current = false;
    };
  }, [threadId]);

  // 3. Mutations with Optimistic Updates

  const toggleReactionMutation = useMutation({
    mutationFn: async () => {
        if (!threadId || !lenser) return;
        return threadInteractionService.toggleThreadReaction(threadId, lenser.id);
    },
    onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: keys.threads.detail(threadId!) });
        const previousThread = queryClient.getQueryData<ThreadDetailViewModel>(keys.threads.detail(threadId!));

        if (previousThread) {
            queryClient.setQueryData<ThreadDetailViewModel>(keys.threads.detail(threadId!), {
                ...previousThread,
                userHasReacted: !previousThread.userHasReacted,
                reactionCount: previousThread.userHasReacted 
                    ? previousThread.reactionCount - 1 
                    : previousThread.reactionCount + 1
            });
        }
        return { previousThread };
    },
    onError: (err, variables, context) => {
        if (context?.previousThread) {
            queryClient.setQueryData(keys.threads.detail(threadId!), context.previousThread);
        }
    },
    onSettled: () => {
        // Optional: invalidate to sync with server, but optimistically usually enough for simple counters
        // queryClient.invalidateQueries({ queryKey: keys.threads.detail(threadId!) });
    }
  });

  const toggleReplyReactionMutation = useMutation({
    mutationFn: async (replyId: string) => {
        if (!lenser) return;
        return threadInteractionService.toggleReplyReaction(replyId, lenser.id);
    },
    onMutate: async (replyId) => {
        await queryClient.cancelQueries({ queryKey: keys.threads.detail(threadId!) });
        const previousThread = queryClient.getQueryData<ThreadDetailViewModel>(keys.threads.detail(threadId!));

        if (previousThread) {
            const updatedReplies = updateReplyInTree(previousThread.replies, replyId, (r) => ({
                ...r,
                userHasReacted: !r.userHasReacted,
                reactionCount: r.userHasReacted ? r.reactionCount - 1 : r.reactionCount + 1
            }));

            queryClient.setQueryData<ThreadDetailViewModel>(keys.threads.detail(threadId!), {
                ...previousThread,
                replies: updatedReplies
            });
        }
        return { previousThread };
    },
    onError: (err, vars, context) => {
        if (context?.previousThread) {
            queryClient.setQueryData(keys.threads.detail(threadId!), context.previousThread);
        }
    }
  });

  const addReplyMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string, parentId?: string }) => {
        if (!threadId || !lenser) throw new Error("Pre-check failed");
        return threadInteractionService.postReply(threadId, lenser.id, content, parentId);
    },
    onSuccess: (newReply, { parentId }) => {
        queryClient.setQueryData<ThreadDetailViewModel>(keys.threads.detail(threadId!), (old) => {
            if (!old) return old;
            return {
                ...old,
                replies: insertReplyInTree(old.replies, newReply, parentId)
            };
        });
    }
  });

  return { 
    thread: thread || null, 
    loading, 
    error: queryError ? (queryError as Error).message : null, 
    toggleReaction: toggleReactionMutation.mutate, 
    toggleReplyReaction: toggleReplyReactionMutation.mutate, 
    addReply: async (content: string, parentId?: string) => addReplyMutation.mutateAsync({ content, parentId }) 
  };
};
