
import { getThreadsRepository } from '../adapters/threadsAdapter';
import { getLenserRepository } from '../adapters/lenserAdapter';
import { reactionService } from './reactionService';
import { ThreadReplyViewModel } from '../types/threads.types';
import { MentionParser } from '../utils/mentionParser';

const threadsRepo = getThreadsRepository();
const lenserRepo = getLenserRepository();

export const threadInteractionService = {
  
  toggleThreadReaction: async (threadId: string, lenserId: string): Promise<{ added: boolean, newCount: number }> => {
    if (!lenserId) throw new Error("Must be logged in to react");
    
    // Use unified service (default to 'like' for threads main reaction)
    const { added, summary } = await reactionService.toggleReaction('thread', threadId, lenserId, 'like');
    
    return { added, newCount: summary.total };
  },

  toggleReplyReaction: async (replyId: string, lenserId: string): Promise<{ added: boolean, newCount: number }> => {
    if (!lenserId) throw new Error("Must be logged in to react");
    
    // Use unified service for reply
    const { added, summary } = await reactionService.toggleReaction('thread_reply', replyId, lenserId, 'like');
    
    return { added, newCount: summary.total };
  },

  postReply: async (threadId: string, lenserId: string, content: string, parentReplyId?: string): Promise<ThreadReplyViewModel> => {
    if (!content.trim()) throw new Error("Reply cannot be empty");
    
    // Pure Fabrication: Sanitize/Parse content before saving
    const cleanedContent = MentionParser.cleanContent(content); 

    const record = await threadsRepo.createReply(threadId, lenserId, cleanedContent, parentReplyId);
    const author = await lenserRepo.getLenserById(lenserId);

    // Return view model immediately for UI append
    return {
        id: record.id,
        content: record.content,
        createdAt: record.created_at,
        reactionCount: 0,
        isDeleted: false,
        author: {
            id: author?.id || 'unknown',
            displayName: author?.display_name || 'Unknown',
            handle: author?.handle || 'unknown',
            avatarUrl: author?.avatar_url
        }
    };
  },

  getReplyTree: async (threadId: string, currentLenserId?: string): Promise<ThreadReplyViewModel[]> => {
    const records = await threadsRepo.getThreadReplies(threadId);
    
    // 1. Fetch all authors
    const uniqueLenserIds = Array.from(new Set(records.map(r => r.lenser_id)));
    const authorsMap = new Map();
    await Promise.all(uniqueLenserIds.map(async (id) => {
        const l = await lenserRepo.getLenserById(id);
        if (l) authorsMap.set(id, l);
    }));

    // 2. Fetch all reaction summaries in parallel
    const reactionSummaries = await Promise.all(
        records.map(r => reactionService.getReactionSummary('thread_reply', r.id, currentLenserId))
    );
    const reactionsMap = new Map();
    records.forEach((r, idx) => {
        reactionsMap.set(r.id, reactionSummaries[idx]);
    });

    // 3. Convert to ViewModel (Flat)
    const viewModels: (ThreadReplyViewModel & { parentId?: string | null })[] = records.map(r => {
        const author = authorsMap.get(r.lenser_id);
        const reactionData = reactionsMap.get(r.id);
        
        // Handle Soft Delete Presentation
        const isDeleted = !!r.deleted_at;
        const content = isDeleted ? "[This comment has been deleted]" : r.content;

        return {
            id: r.id,
            parentId: r.parent_reply_id,
            content,
            createdAt: r.created_at,
            reactionCount: reactionData ? reactionData.total : 0,
            // We could add 'userHasReacted' to ViewModel if UI supported highlighting replies liked by user
            // For now, assuming UI just shows count or simple toggle state. 
            // We'll augment the VM type implicitly here if needed, but existing type handles reactionCount.
            isDeleted,
            replies: [], // init
            author: {
                id: author?.id || 'unknown',
                displayName: author?.display_name || 'Unknown',
                handle: author?.handle || 'unknown',
                avatarUrl: author?.avatar_url
            }
        };
    });

    // 4. Build Tree
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

    return rootReplies;
  }
};
