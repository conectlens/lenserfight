
import { getThreadsRepository } from '../adapters/threadsAdapter';
import { getLenserRepository } from '../adapters/lenserAdapter';
import { reactionService } from './reactionService';
import { ThreadFeedItem, ThreadDetailViewModel, ThreadRecord, Visibility, CreateThreadDTO } from '../types/threads.types';
import { threadInteractionService } from './threadInteractionService';
import { tagService } from './tagService';
import { tagActivityService } from './tagActivityService';

const threadsRepo = getThreadsRepository();
const lenserRepo = getLenserRepository();

export const threadsService = {
  createThread: async (input: { title: string; content: string; tagIds: string[]; lenserId: string; visibility: Visibility }): Promise<ThreadRecord> => {
    if (!input.title || input.title.trim() === '') {
      throw new Error("Thread title is required.");
    }
    if (!input.lenserId) {
      throw new Error("User must be logged in with a profile to post.");
    }
    
    const resolvedTags = await tagService.upsertTags(input.tagIds);
    const realTagIds = resolvedTags.map(t => t.id);

    const thread = await threadsRepo.createThread({
      ...input,
      tagIds: realTagIds
    });

    Promise.all(realTagIds.map(tagId => 
      tagActivityService.recordActivity(tagId, 'thread', thread.id, input.lenserId, 'created')
    )).catch(console.error);

    return thread;
  },

  updateThread: async (id: string, input: Partial<CreateThreadDTO>, lenserId: string): Promise<ThreadRecord> => {
      const existing = await threadsRepo.getThreadById(id);
      if (!existing) throw new Error("Thread not found");
      if (existing.lenser_id !== lenserId) throw new Error("Unauthorized to edit this thread");

      let realTagIds: string[] | undefined = undefined;
      if (input.tagIds) {
          const resolvedTags = await tagService.upsertTags(input.tagIds);
          realTagIds = resolvedTags.map(t => t.id);
      }

      return threadsRepo.updateThread(id, { ...input, tagIds: realTagIds });
  },

  deleteThread: async (id: string, lenserId: string): Promise<void> => {
      const existing = await threadsRepo.getThreadById(id);
      if (!existing) throw new Error("Thread not found");
      if (existing.lenser_id !== lenserId) throw new Error("Unauthorized to delete this thread");

      await threadsRepo.deleteThread(id);
  },

  getThreadsFeed: async (currentUserId?: string, offset = 0, limit = 10): Promise<ThreadFeedItem[]> => {
    // Global feed, only public
    const threads = await threadsRepo.getAllThreads(offset, limit);
    return threadsService._enrichThreads(threads, currentUserId);
  },

  getThreadsByTag: async (slug: string, currentUserId?: string, offset = 0, limit = 10): Promise<ThreadFeedItem[]> => {
    const threads = await threadsRepo.getThreadsByTag(slug, offset, limit);
    return threadsService._enrichThreads(threads, currentUserId);
  },

  getThreadsByAuthor: async (authorId: string, currentUserId?: string, offset = 0, limit = 10): Promise<ThreadFeedItem[]> => {
    const threads = await lenserRepo.getThreadsByLenser(authorId, offset, limit, currentUserId);
    return threadsService._enrichThreads(threads, currentUserId);
  },

  // Helper to DRY up enrichment logic
  _enrichThreads: async (threads: ThreadRecord[], currentUserId?: string): Promise<ThreadFeedItem[]> => {
    const feedItems = await Promise.all(
      threads.map(async (thread) => {
        const [author, tags, reactionSummary] = await Promise.all([
          lenserRepo.getLenserById(thread.lenser_id),
          threadsRepo.getThreadTags(thread.id),
          reactionService.getReactionSummary('thread', thread.id, currentUserId)
        ]);

        return {
          id: thread.id,
          author: {
            id: author?.id || 'unknown',
            displayName: author?.display_name || 'Unknown User',
            avatarUrl: author?.avatar_url,
            handle: author?.handle || 'unknown',
          },
          title: thread.title,
          content: thread.content,
          tags: tags,
          reactionCount: reactionSummary.total,
          userHasReacted: reactionSummary.userReactions.length > 0,
          replyCount: thread.reply_count,
          createdAt: thread.created_at,
        };
      })
    );
    return feedItems;
  },

  getThreadDetail: async (threadId: string, currentUserId?: string): Promise<ThreadDetailViewModel | null> => {
    // 1. Fire and forget view increment
    threadsRepo.incrementView(threadId).catch(() => {});

    const thread = await threadsRepo.getThreadById(threadId);
    if (!thread) return null;

    // Access Control
    if (thread.visibility === 'private') {
        if (!currentUserId || thread.lenser_id !== currentUserId) {
            throw new Error("401");
        }
    }

    const [author, tags, reactionSummary, replies] = await Promise.all([
      lenserRepo.getLenserById(thread.lenser_id),
      threadsRepo.getThreadTags(thread.id),
      reactionService.getReactionSummary('thread', thread.id, currentUserId),
      threadInteractionService.getReplyTree(thread.id, currentUserId)
    ]);
    
    if (tags.length > 0) {
        Promise.all(tags.map(t => tagActivityService.recordView(t.id, 'thread', thread.id, currentUserId))).catch(() => {});
    }

    return {
        id: thread.id,
        title: thread.title,
        content: thread.content,
        createdAt: thread.created_at,
        author: {
            id: author?.id || 'unknown',
            displayName: author?.display_name || 'Unknown',
            avatarUrl: author?.avatar_url,
            handle: author?.handle || 'unknown'
        },
        tags,
        reactionCount: reactionSummary.total,
        userHasReacted: reactionSummary.userReactions.length > 0,
        replies,
        promptBlock: thread.prompt_data
    };
  },

  getTrendingTags: async (limit: number = 6): Promise<string[]> => {
      return threadsRepo.getTrendingTags(limit);
  }
};
