
import { getThreadsRepository } from '../adapters/threadsAdapter';
import { getLenserRepository } from '../adapters/lenserAdapter';
import { reactionService } from './reactionService';
import { ThreadReplyViewModel } from '../types/threads.types';
import { MentionParser } from '../utils/mentionParser';
import { contentModerationService } from './contentModerationService';

const threadsRepo = getThreadsRepository();
const lenserRepo = getLenserRepository();

export const threadInteractionService = {
  
  toggleThreadReaction: async (threadId: string, lenserId: string): Promise<{ added: boolean, newCount: number }> => {
    if (!lenserId) throw new Error("Must be logged in to react");
    const { added, summary } = await reactionService.toggleReaction('thread', threadId, lenserId, 'like');
    return { added, newCount: summary.total };
  },

  toggleReplyReaction: async (replyId: string, lenserId: string): Promise<{ added: boolean, newCount: number }> => {
    if (!lenserId) throw new Error("Must be logged in to react");
    const { added, summary } = await reactionService.toggleReaction('thread_reply', replyId, lenserId, 'like');
    return { added, newCount: summary.total };
  },

  postReply: async (threadId: string, lenserId: string, content: string, parentReplyId?: string): Promise<ThreadReplyViewModel> => {
    if (!content.trim()) throw new Error("Reply cannot be empty");
    
    // Moderation Check
    // TODO: moderation policy will not be used in the beta version
    // await contentModerationService.validate(content);

    const cleanedContent = MentionParser.cleanContent(content); 

    const record = await threadsRepo.createReply(threadId, lenserId, cleanedContent, parentReplyId);
    
    // Use author_profile directly from record
    const profile = record.author_profile || { id: 'unknown', handle: 'unknown', display_name: 'Unknown', avatar_url: null };

    return {
        id: record.id,
        content: record.content,
        createdAt: record.created_at,
        reactionCount: 0,
        userHasReacted: false,
        isDeleted: false,
        author: {
            id: profile.id || lenserId,
            displayName: profile.display_name,
            handle: profile.handle,
            avatarUrl: profile.avatar_url
        }
    };
  },

  getReplyTree: async (threadId: string, currentLenserId?: string): Promise<ThreadReplyViewModel[]> => {
    const records = await threadsRepo.getThreadReplies(threadId);
    
    // We no longer fetch lensers separately; each record contains author_profile.

    // Fetch all reaction summaries in parallel
    const reactionSummaries = await Promise.all(
        records.map(r => reactionService.getReactionSummary('thread_reply', r.id, currentLenserId))
    );
    const reactionsMap = new Map();
    records.forEach((r, idx) => {
        reactionsMap.set(r.id, reactionSummaries[idx]);
    });

    const viewModels: (ThreadReplyViewModel & { parentId?: string | null })[] = records.map(r => {
        const profile = r.author_profile || { id: 'unknown', handle: 'unknown', display_name: 'Unknown', avatar_url: null };
        
        const reactionData = reactionsMap.get(r.id);
        const userReactions = reactionData?.userReactions || [];
        const hasReacted = userReactions.includes('like');
        
        const isDeleted = !!r.deleted_at;
        const content = isDeleted ? "[This comment has been deleted]" : r.content;

        return {
            id: r.id,
            parentId: r.parent_reply_id,
            content,
            createdAt: r.created_at,
            reactionCount: reactionData ? reactionData.total : 0,
            userHasReacted: hasReacted,
            isDeleted,
            replies: [], // init
            author: {
                id: profile.id || r.lenser_id,
                displayName: profile.display_name,
                handle: profile.handle,
                avatarUrl: profile.avatar_url
            }
        };
    });

    // Build Tree
    const rootReplies: ThreadReplyViewModel[] = [];
    const replyMap = new Map<string, ThreadReplyViewModel>();

    viewModels.forEach(vm => replyMap.set(vm.id, vm));

    viewModels.forEach(vm => {
        if (vm.parentId && replyMap.has(vm.parentId)) {
            const parent = replyMap.get(vm.parentId);
            if (parent) {
                if (!parent.replies) parent.replies = [];
                parent.replies.push(vm);
            }
        } else {
            rootReplies.push(vm);
        }
    });

    // Sort
    const sortReplies = (items: ThreadReplyViewModel[]) => {
        items.sort((a, b) => {
            if (b.reactionCount !== a.reactionCount) {
                return b.reactionCount - a.reactionCount;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        items.forEach(item => {
            if (item.replies && item.replies.length > 0) {
                sortReplies(item.replies);
            }
        });
    };

    sortReplies(rootReplies);

    return rootReplies;
  }
};
