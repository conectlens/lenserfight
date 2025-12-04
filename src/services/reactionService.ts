
import { getReactionRepository } from '../adapters/reactionAdapter';
import { getThreadsRepository } from '../adapters/threadsAdapter';
import { getPromptsRepository } from '../adapters/promptsAdapter';
import { TargetType, ReactionType, ReactionSummary, ActivityFeedItem } from '../types/reactions.types';

const reactionRepo = getReactionRepository();
const threadsRepo = getThreadsRepository();
const promptsRepo = getPromptsRepository();

export const reactionService = {
  validateTarget: (targetType: string) => {
    const validTypes: TargetType[] = ['thread', 'thread_reply', 'prompt_template'];
    if (!validTypes.includes(targetType as TargetType)) {
      throw new Error(`Invalid reaction target type: ${targetType}`);
    }
  },

  getReactionSummary: async (targetType: TargetType, targetId: string, currentLenserId?: string): Promise<ReactionSummary> => {
    reactionService.validateTarget(targetType);

    const [countsList, userReactions] = await Promise.all([
      reactionRepo.countReactions(targetType, targetId),
      currentLenserId ? reactionRepo.getUserReaction(targetType, targetId, currentLenserId) : Promise.resolve([])
    ]);

    const counts: Record<ReactionType, number> = {
      like: 0,
      love: 0,
      clap: 0,
      saved: 0,
      copy: 0
    };
    let total = 0;

    countsList.forEach(c => {
      counts[c.reaction] = c.count;
      // Exclude 'saved' and 'copy' from the generic "reaction" count shown in some UIs (like thread upvotes),
      // or customize based on UI needs. For now, 'copy' is a usage metric, 'saved' is a bookmark.
      if (c.reaction !== 'saved' && c.reaction !== 'copy') {
          total += c.count;
      }
    });

    return {
      counts,
      total,
      userReactions: userReactions.map(r => r.reaction)
    };
  },

  toggleReaction: async (
    targetType: TargetType, 
    targetId: string, 
    lenserId: string, 
    reaction: ReactionType
  ): Promise<{ added: boolean; summary: ReactionSummary }> => {
    reactionService.validateTarget(targetType);

    // Optimistic check
    const existing = await reactionRepo.getUserReaction(targetType, targetId, lenserId);
    let hasReacted = existing.some(r => r.reaction === reaction);
    let added = false;

    try {
      if (hasReacted) {
        await reactionRepo.removeReaction(targetType, targetId, lenserId, reaction);
        added = false;
      } else {
        try {
          await reactionRepo.addReaction(targetType, targetId, lenserId, reaction);
          added = true;
        } catch (e: any) {
          // Handle Duplicate Key Error (Race condition or Stale state)
          // Code 23505 is PostgreSQL unique constraint violation
          if (e.code === '23505' || e.message?.includes('duplicate key') || e.details?.includes('already exists')) {
            console.warn("Reaction already exists despite check, toggling to remove.");
            await reactionRepo.removeReaction(targetType, targetId, lenserId, reaction);
            added = false;
          } else {
            throw e;
          }
        }
      }
    } catch (err) {
      console.error("Toggle reaction failed", err);
      throw err;
    }

    // Return fresh summary for UI update
    const summary = await reactionService.getReactionSummary(targetType, targetId, lenserId);
    
    return {
      added,
      summary
    };
  },

  recordReaction: async (targetType: TargetType, targetId: string, lenserId: string, reaction: ReactionType): Promise<void> => {
    reactionService.validateTarget(targetType);
    try {
      await reactionRepo.addReaction(targetType, targetId, lenserId, reaction);
    } catch (e: any) {
      // Ignore duplicates for simple recording (e.g. copy)
      if (e.code !== '23505') throw e;
    }
  },

  getUserActivityFeed: async (lenserId: string, offset = 0, limit = 20): Promise<ActivityFeedItem[]> => {
      const reactions = await reactionRepo.getUserHistory(lenserId, offset, limit);
      
      const enriched = await Promise.all(reactions.map(async (r) => {
          let title = "Unknown Content";
          
          try {
              if (r.target_type === 'thread') {
                  const t = await threadsRepo.getThreadById(r.target_id);
                  if (t) title = t.title;
              } else if (r.target_type === 'prompt_template') {
                  const p = await promptsRepo.getById(r.target_id);
                  if (p) title = p.title;
              } else if (r.target_type === 'thread_reply') {
                  const reply = await threadsRepo.getReplyById(r.target_id);
                  if (reply) {
                      title = reply.content.length > 60 
                          ? `Reply: "${reply.content.substring(0, 60)}..."`
                          : `Reply: "${reply.content}"`;
                  }
              }
          } catch (e) {
              console.warn(`Failed to resolve target for reaction ${r.id}`, e);
          }

          return {
              id: r.id,
              reaction: r.reaction,
              targetType: r.target_type,
              targetId: r.target_id,
              targetTitle: title,
              createdAt: r.created_at
          };
      }));

      return enriched.filter(item => item.targetTitle !== "Unknown Content");
  }
};
