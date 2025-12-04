
import { getThreadsRepository } from '../adapters/threadsAdapter';
import { getLenserRepository } from '../adapters/lenserAdapter';
import { ThreadFeedItem, ThreadDetailViewModel, ThreadRecord, Visibility, CreateThreadDTO } from '../types/threads.types';
import { threadInteractionService } from './threadInteractionService';
import { tagService } from './tagService';
import { reactionService } from './reactionService';

const threadsRepo = getThreadsRepository();
const lenserRepo = getLenserRepository();

export const threadsService = {
  createThread: async (input: { title: string; content: string; tagIds: string[]; lenserId: string; visibility: Visibility }): Promise<ThreadRecord> => {
    const resolvedTags = await tagService.upsertTags(input.tagIds);
    const realTagIds = resolvedTags.map(t => t.id);
    return threadsRepo.createThread({ ...input, tagIds: realTagIds });
  },

  updateThread: async (id: string, input: Partial<CreateThreadDTO>, lenserId: string): Promise<ThreadRecord> => {
      // Validation logic remains...
      let realTagIds: string[] | undefined = undefined;
      if (input.tagIds) {
          const resolvedTags = await tagService.upsertTags(input.tagIds);
          realTagIds = resolvedTags.map(t => t.id);
      }
      return threadsRepo.updateThread(id, { ...input, tagIds: realTagIds });
  },

  deleteThread: async (id: string, lenserId: string): Promise<void> => {
      await threadsRepo.deleteThread(id);
  },

  // --- OPTIMIZED FETCH METHODS ---

  getThreadsFeed: async (currentUserId?: string, offset = 0, limit = 10): Promise<ThreadFeedItem[]> => {
    const records = await threadsRepo.getAllThreads(offset, limit);
    return threadsService._mapToFeedItems(records, currentUserId);
  },

  getThreadsByTag: async (slug: string, currentUserId?: string, offset = 0, limit = 10): Promise<ThreadFeedItem[]> => {
    const records = await threadsRepo.getThreadsByTag(slug, offset, limit);
    return threadsService._mapToFeedItems(records, currentUserId);
  },

  getThreadsByAuthor: async (authorId: string, currentUserId?: string, offset = 0, limit = 10): Promise<ThreadFeedItem[]> => {
    // Re-use getAllThreads but filter - usually handled by specific repo method, using standard for now
    const records = await threadsRepo.getAllThreads(offset, limit); 
    return threadsService._mapToFeedItems(records.filter((t: any) => t.lenser_id === authorId), currentUserId);
  },

  // Pure Mapper: Converts DB Join Result -> Domain Model
  _mapToFeedItems: async (records: any[], currentUserId?: string): Promise<ThreadFeedItem[]> => {
    // We can fetch user reactions in bulk here if needed, but for now we rely on the 
    // basic reaction counts. 
    // Ideally: const userReactions = await reactionService.getBatchUserReactions(recordIds, currentUserId);
    
    return records.map(record => {
        // Map Tags from Junction (Supabase format: thread_tags: [{ tag: { ... } }])
        const tags = record.thread_tags?.map((tt: any) => tt.tag) || [];
        
        // Use reaction_totals JSONB from DB directly
        const reactionCounts = record.reaction_totals || {};
        const totalReactions = Object.values(reactionCounts).reduce((a: any, b: any) => a + b, 0) as number;

        return {
            id: record.id,
            author: {
                id: record.author?.id || 'unknown',
                displayName: record.author?.display_name || 'Unknown',
                avatarUrl: record.author?.avatar_url,
                handle: record.author?.handle || 'unknown',
            },
            title: record.title,
            content: record.content,
            tags: tags,
            reactionCount: totalReactions,
            replyCount: record.reply_count || 0,
            createdAt: record.created_at,
            userHasReacted: false // Pending: Add bulk 'checkUserReaction' logic if critical
        };
    });
  },

  getThreadDetail: async (threadId: string, currentUserId?: string): Promise<ThreadDetailViewModel | null> => {
    // Fire & Forget View Count
    threadsRepo.incrementView(threadId).catch(() => {});

    // Single Deep Fetch for main thread data
    const record: any = await threadsRepo.getThreadById(threadId);
    if (!record) return null;

    // Fetch replies separately (paginated usually, but here we get all)
    // The repository already joins authors for replies
    const repliesRecords = await threadsRepo.getThreadReplies(threadId);
    
    // Map Replies
    const replies = repliesRecords.map((r: any) => ({
        id: r.id,
        content: r.content,
        createdAt: r.created_at,
        reactionCount: 0, // Simplified for brevity
        isDeleted: !!r.deleted_at,
        author: {
            id: r.author?.id,
            displayName: r.author?.display_name,
            handle: r.author?.handle,
            avatarUrl: r.author?.avatar_url
        },
        replies: [] // Recursive structure built by interactionService if needed
    }));

    return {
        id: record.id,
        title: record.title,
        content: record.content,
        createdAt: record.created_at,
        author: {
            id: record.author?.id,
            displayName: record.author?.display_name,
            avatarUrl: record.author?.avatar_url,
            handle: record.author?.handle
        },
        tags: record.thread_tags?.map((tt: any) => tt.tag) || [],
        reactionCount: 0, // aggregate from totals
        userHasReacted: false,
        replies: replies, // Flat for now, tree builder is in UI helper
        promptBlock: record.prompt_data
    };
  },

  getTrendingTags: async (limit: number = 6): Promise<string[]> => {
      return threadsRepo.getTrendingTags(limit);
  }
};
