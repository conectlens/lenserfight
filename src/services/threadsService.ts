
import { getThreadsRepository } from '../adapters/threadsAdapter';
import { getLenserRepository } from '../adapters/lenserAdapter';
import { getReactionRepository } from '../adapters/reactionAdapter';
import { ThreadFeedItem, ThreadDetailViewModel, ThreadRecord, Visibility, CreateThreadDTO } from '../types/threads.types';
import { threadInteractionService } from './threadInteractionService';
import { tagService } from './tagService';
import { xpService } from './xpService';
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
    const thread = await threadsRepo.createThread({ ...input, tagIds: realTagIds });
    
    // Award XP
    xpService.notifyThreadCreated(input.lenserId, thread.id).catch(console.error);
    
    return thread;
  },

  updateThread: async (id: string, input: Partial<CreateThreadDTO>, lenserId: string): Promise<ThreadRecord> => {
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

  incrementView: async (id: string): Promise<void> => {
      return threadsRepo.incrementView(id);
  },

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

  // Pure Mapper: Converts DB Record -> Domain Model using internal author_profile and tags
  _mapToFeedItems: async (records: ThreadRecord[], currentUserId?: string): Promise<ThreadFeedItem[]> => {
    if (records.length === 0) return [];

    let userReactedIds = new Set<string>();
    if (currentUserId) {
        const ids = records.map(r => r.id);
        const reactions = await reactionRepo.getBatchUserReactions('thread', ids, currentUserId);
        reactions.forEach(r => userReactedIds.add(r.target_id));
    }

    return records.map(record => {
        const tags = record.tags || []; // Use denormalized tags directly
        
        const reactionCounts = record.reaction_totals || {};
        const totalReactions = Object.values(reactionCounts).reduce((a: any, b: any) => a + b, 0) as number;

        const profile = record.author_profile || { id: 'unknown', handle: 'unknown', display_name: 'Unknown', avatar_url: null };

        return {
            id: record.id,
            author: {
                id: profile.id || record.lenser_id,
                displayName: profile.display_name,
                avatarUrl: profile.avatar_url,
                handle: profile.handle,
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
    const record: any = await threadsRepo.getThreadById(threadId);
    if (!record) return null;

    if (record.visibility === 'private') {
        if (!currentUserId || record.lenser_id !== currentUserId) {
            throw new Error("401"); 
        }
    }

    // Award Engagement XP if viewing
    if (currentUserId) {
        xpService.notifyThreadEngaged(currentUserId, threadId).catch(console.error);
    }

    let userHasReacted = false;
    if (currentUserId) {
        const [reaction] = await reactionRepo.getUserReaction('thread', threadId, currentUserId);
        userHasReacted = !!reaction;
    }

    const replies = await threadInteractionService.getReplyTree(threadId, currentUserId);

    const reactionCounts = record.reaction_totals || {};
    const totalReactions = Object.values(reactionCounts).reduce((a: any, b: any) => a + b, 0) as number;
    const profile = record.author_profile || { id: 'unknown', handle: 'unknown', display_name: 'Unknown', avatar_url: null };

    return {
        id: record.id,
        title: record.title,
        content: record.content,
        createdAt: record.created_at,
        author: {
            id: profile.id || record.lenser_id,
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url,
            handle: profile.handle
        },
        tags: record.tags || [],
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