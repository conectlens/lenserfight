
import { useState, useEffect } from 'react';
import { threadsService } from '../../../services/threadsService';
import { threadInteractionService } from '../../../services/threadInteractionService';
import { ThreadDetailViewModel } from '../../../types/threads.types';
import { useLenser } from '../../../context/LenserContext';

export const useThreadDetailController = (threadId?: string) => {
  const { lenser } = useLenser();
  const [thread, setThread] = useState<ThreadDetailViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchThreadData = async () => {
      if (!threadId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await threadsService.getThreadDetail(threadId, lenser?.id);
        
        if (data) {
          setThread(data);
        } else {
            setError("404");
        }
      } catch (err: any) {
        if (err.message === '401') {
            setError("401");
        } else {
            console.error(err);
            setError("Failed to load thread.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchThreadData();
  }, [threadId, lenser?.id]);

  const toggleReaction = async () => {
      if (!thread || !lenser || !threadId) return;

      const previousState = thread.userHasReacted;
      const previousCount = thread.reactionCount;

      setThread(prev => prev ? ({
          ...prev,
          userHasReacted: !prev.userHasReacted,
          reactionCount: prev.userHasReacted ? prev.reactionCount - 1 : prev.reactionCount + 1
      }) : null);

      try {
         const result = await threadInteractionService.toggleThreadReaction(threadId, lenser.id);
         setThread(prev => prev ? ({ ...prev, reactionCount: result.newCount, userHasReacted: result.added }) : null);
      } catch (e) {
         setThread(prev => prev ? ({ ...prev, reactionCount: previousCount, userHasReacted: previousState }) : null);
         console.error(e);
      }
  };

  const toggleReplyReaction = async (replyId: string) => {
    if (!lenser) return;
    
    const updateReplyInTree = (replies: any[], id: string, updater: (r: any) => any): any[] => {
        return replies.map(r => {
            if (r.id === id) return updater(r);
            if (r.replies) return { ...r, replies: updateReplyInTree(r.replies, id, updater) };
            return r;
        });
    };

    // Optimistic Update
    setThread(prev => {
        if (!prev) return null;
        return {
            ...prev,
            replies: updateReplyInTree(prev.replies, replyId, (r) => ({
                ...r,
                // If user already liked, decrease count, else increase
                reactionCount: r.userHasReacted ? r.reactionCount - 1 : r.reactionCount + 1,
                userHasReacted: !r.userHasReacted
            }))
        };
    });

    try {
        const result = await threadInteractionService.toggleReplyReaction(replyId, lenser.id);
        // Correct state with actual server response
        setThread(prev => {
            if (!prev) return null;
            return {
                ...prev,
                replies: updateReplyInTree(prev.replies, replyId, (r) => ({
                    ...r,
                    reactionCount: result.newCount,
                    userHasReacted: result.added
                }))
            };
        });
    } catch (e) {
        console.error(e);
        // Fallback or error handling logic could go here
    }
  };

  const addReply = async (content: string, parentId?: string) => {
      if (!thread || !lenser || !threadId) return;

      try {
          const newReply = await threadInteractionService.postReply(threadId, lenser.id, content, parentId);
          
          setThread(prev => {
              if (!prev) return null;
              
              const insertNode = (nodes: any[]): any[] => {
                  if (!parentId) return [...nodes, newReply];
                  
                  return nodes.map(node => {
                      if (node.id === parentId) {
                          return { ...node, replies: [...(node.replies || []), newReply] };
                      }
                      if (node.replies) {
                          return { ...node, replies: insertNode(node.replies) };
                      }
                      return node;
                  });
              };

              return {
                  ...prev,
                  replies: insertNode(prev.replies)
              };
          });
      } catch (e) {
          console.error(e);
          throw e;
      }
  };

  return { thread, loading, error, toggleReaction, toggleReplyReaction, addReply };
};
