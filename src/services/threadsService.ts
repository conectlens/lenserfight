
import { getThreadsRepository } from '../adapters/threadsAdapter';
import { getLenserRepository } from '../adapters/lenserAdapter';
import { getReactionRepository } from '../adapters/reactionAdapter';
import { ThreadFeedItem, ThreadDetailViewModel, ThreadRecord, Visibility, CreateThreadDTO } from '../types/threads.types';
import { threadInteractionService } from './threadInteractionService';
import { tagService } from './tagService';
import { contentModerationService } from './contentModerationService';

const threadsRepo = getThreadsRepository();
const lenserRepo = getLenserRepository();
const reactionRepo = getReactionRepository();

export const threadsService = {
  createThread: async (input: { title: string; content: string; tagIds: string[]; lenserId: string; visibility: Visibility }): Promise<ThreadRecord> => {
    // Moderation Check
    // TODO: moderation policy will not be used in the beta version
    // await contentModerationService.validate(input.title, input.content);

    const resolvedTags = await tagService.upsertTags(input.tagIds);
    const realTagIds = resolvedTags.map(t => t.id);
    return threadsRepo.createThread({ ...input, tagIds: realTagIds });
  },

  updateThread: async (id: string, input: Partial<CreateThreadDTO>, lenserId: string): Promise<ThreadRecord> => {
      // Moderation Check
      // TODO: moderation policy will not be used in the beta version
      // await contentModerationService.validate(input.title, input.content);

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
    const includePrivate = authorId === currentUserId;
    const records = await threadsRepo.getByAuthor(authorId, offset, limit, includePrivate);
    return threadsService._mapToFeedItems(records, currentUserId);
  },

  // Pure Mapper: Converts DB Join Result -> Domain Model + Batch Reaction State
  _mapToFeedItems: async (records: any[], currentUserId?: string): Promise<ThreadFeedItem[]> => {
    if (records.length === 0) return [];

    // 1. Batch fetch user reactions if logged in (O(1) request)
    let userReactedIds = new Set<string>();
    if (currentUserId) {
        const ids = records.map(r => r.id);
        const reactions = await reactionRepo.getBatchUserReactions('thread', ids, currentUserId);
        reactions.forEach(r => userReactedIds.add(r.target_id));
    }

    // 2. Map in memory
    return records.map(record => {
        // Map Tags from Junction (Supabase format: thread_tags: [{ tag: { ... } }])
        // Filter out any potential nulls from join
        const tags = (record.thread_tags?.map((tt: any) => tt.tag) || []).filter((t: any) => !!t);
        
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
            userHasReacted: userReactedIds.has(record.id),
            visibility: record.visibility
        };
    });
  },

  getThreadDetail: async (threadId: string, currentUserId?: string): Promise<ThreadDetailViewModel | null> => {
    // Fire & Forget View Count
    threadsRepo.incrementView(threadId).catch(() => {});

    const record: any = await threadsRepo.getThreadById(threadId);
    if (!record) return null;

    if (record.visibility === 'private') {
        if (!currentUserId || record.lenser_id !== currentUserId) {
            throw new Error("401"); 
        }
    }

    // Check main thread reaction
    let userHasReacted = false;
    if (currentUserId) {
        const [reaction] = await reactionRepo.getUserReaction('thread', threadId, currentUserId);
        userHasReacted = !!reaction;
    }

    // Delegate reply fetching to interaction service for tree building + advanced stats
    const replies = await threadInteractionService.getReplyTree(threadId, currentUserId);

    // Aggregate counts
    const reactionCounts = record.reaction_totals || {};
    const totalReactions = Object.values(reactionCounts).reduce((a: any, b: any) => a + b, 0) as number;

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
        tags: (record.thread_tags?.map((tt: any) => tt.tag) || []).filter((t: any) => !!t),
        reactionCount: totalReactions,
        userHasReacted: userHasReacted,
        replies: replies,
        promptBlock: record.prompt_data,
        visibility: record.visibility
    };
  },

  getTrendingTags: async (limit: number = 6): Promise<string[]> => {
      return threadsRepo.getTrendingTags(limit);
  }
};
