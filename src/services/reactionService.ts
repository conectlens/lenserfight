
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
      saved: 0
    };
    let total = 0;

    countsList.forEach(c => {
      counts[c.reaction] = c.count;
      // We don't usually sum 'saved' into total reaction count for display, but depends on UI requirements.
      // Assuming 'saved' is private-ish or bookmark style, we might exclude it from "Total Reactions".
      if (c.reaction !== 'saved') {
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

    // Check if exists
    const existing = await reactionRepo.getUserReaction(targetType, targetId, lenserId);
    const hasReacted = existing.some(r => r.reaction === reaction);

    if (hasReacted) {
      await reactionRepo.removeReaction(targetType, targetId, lenserId, reaction);
    } else {
      await reactionRepo.addReaction(targetType, targetId, lenserId, reaction);
    }

    // Return fresh summary for UI update
    const summary = await reactionService.getReactionSummary(targetType, targetId, lenserId);
    
    return {
      added: !hasReacted,
      summary
    };
  },

  getUserActivityFeed: async (lenserId: string, limit: number = 20): Promise<ActivityFeedItem[]> => {
      const reactions = await reactionRepo.getUserHistory(lenserId, limit);
      
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
