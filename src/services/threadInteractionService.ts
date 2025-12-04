
import { getThreadsRepository } from '../adapters/threadsAdapter';
import { getLenserRepository } from '../adapters/lenserAdapter';
import { getReactionRepository } from '../adapters/reactionAdapter';
import { reactionService } from './reactionService';
import { ThreadReplyViewModel } from '../types/threads.types';
import { MentionParser } from '../utils/mentionParser';
import { contentModerationService } from './contentModerationService';

const threadsRepo = getThreadsRepository();
const lenserRepo = getLenserRepository();
const reactionRepo = getReactionRepository();

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
    
    // Optimization: Batch Fetch User Reactions
    // Instead of calling reactionService.getReactionSummary for every reply (N+1 queries),
    // we fetch user status in one batch and use denormalized reaction_totals for counts.
    let userReactedIds = new Set<string>();
    
    if (currentLenserId && records.length > 0) {
        const replyIds = records.map(r => r.id);
        try {
            const reactions = await reactionRepo.getBatchUserReactions('thread_reply', replyIds, currentLenserId);
            reactions.forEach(r => {
                // Assuming 'like' is the primary reaction displayed on replies
                if (r.reaction === 'like') {
                    userReactedIds.add(r.target_id);
                }
            });
        } catch (e) {
            console.error("Failed to batch fetch reactions", e);
        }
    }

    const viewModels: (ThreadReplyViewModel & { parentId?: string | null })[] = records.map(r => {
        const profile = r.author_profile || { id: 'unknown', handle: 'unknown', display_name: 'Unknown', avatar_url: null };
        
        // Calculate totals from denormalized JSONB 'reaction_totals' to avoid separate count queries
        const reactionCounts = r.reaction_totals || {};
        const totalReactions = Object.entries(reactionCounts).reduce((acc, [type, count]) => {
            if (type !== 'saved' && type !== 'copy') return acc + (count as number);
            return acc;
        }, 0);
        
        const hasReacted = userReactedIds.has(r.id);
        
        const isDeleted = !!r.deleted_at;
        const content = isDeleted ? "[This comment has been deleted]" : r.content;

        return {
            id: r.id,
            parentId: r.parent_reply_id,
            content,
            createdAt: r.created_at,
            reactionCount: totalReactions,
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
