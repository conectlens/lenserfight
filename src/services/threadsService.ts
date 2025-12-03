import { getThreadsRepository } from '../adapters/threadsAdapter';
import { getLenserRepository } from '../adapters/lenserAdapter';
import { ThreadFeedItem, ThreadDetailViewModel, ThreadReplyViewModel, ThreadRecord, Visibility } from '../types/threads.types';

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
    
    return threadsRepo.createThread(input);
  },

  getThreadsFeed: async (): Promise<ThreadFeedItem[]> => {
    const threads = await threadsRepo.getAllThreads();

    const feedItems = await Promise.all(
      threads.map(async (thread) => {
        const [author, tags, reactionCount] = await Promise.all([
          lenserRepo.getLenserById(thread.lenser_id),
          threadsRepo.getThreadTags(thread.id),
          threadsRepo.getThreadReactionCount(thread.id),
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
          reactionCount: reactionCount,
          replyCount: thread.reply_count,
          createdAt: thread.created_at,
        };
      })
    );

    return feedItems;
  },

  getThreadDetail: async (threadId: string): Promise<ThreadDetailViewModel | null> => {
    const thread = await threadsRepo.getThreadById(threadId);
    if (!thread) return null;

    const [author, tags, reactionCount, repliesData] = await Promise.all([
      lenserRepo.getLenserById(thread.lenser_id),
      threadsRepo.getThreadTags(thread.id),
      threadsRepo.getThreadReactionCount(thread.id),
      threadsRepo.getThreadReplies(thread.id),
    ]);

    const replies: ThreadReplyViewModel[] = await Promise.all(
        repliesData.map(async (reply) => {
            let replyAuthor = await lenserRepo.getLenserById(reply.lenser_id);
            
            if (!replyAuthor && reply.lenser_id === 'lenser-seneca') {
                replyAuthor = { 
                    id: 'lenser-seneca', user_id: 'u-s', handle: 'seneca', 
                    display_name: 'Seneca', avatar_url: 'https://ui-avatars.com/api/?name=Seneca&background=0D8ABC&color=fff', created_at: '' 
                };
            }
            if (!replyAuthor && reply.lenser_id === 'lenser-epictetus') {
                replyAuthor = { 
                    id: 'lenser-epictetus', user_id: 'u-e', handle: 'epictetus', 
                    display_name: 'Epictetus', avatar_url: 'https://ui-avatars.com/api/?name=Epictetus&background=111&color=fff', created_at: '' 
                };
            }

            return {
                id: reply.id,
                author: {
                    id: replyAuthor?.id || 'unknown',
                    displayName: replyAuthor?.display_name || 'Unknown',
                    avatarUrl: replyAuthor?.avatar_url,
                    handle: replyAuthor?.handle || 'unknown'
                },
                content: reply.content,
                createdAt: reply.created_at,
                reactionCount: reply.reaction_count
            };
        })
    );

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
        reactionCount,
        replies,
        promptBlock: thread.prompt_data
    };
  },

  getTrendingTags: async (limit: number = 6): Promise<string[]> => {
      return threadsRepo.getTrendingTags(limit);
  }
};