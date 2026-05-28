import {
  TargetType,
  ReactionType,
  ReactionSummary,
  ActivityFeedItem,
} from '@lenserfight/types'
import { createLensesRepository, createReactionRepository, createThreadsRepository } from '../factory'


const reactionRepo = createReactionRepository()
const threadsRepo = createThreadsRepository()
const lensesRepo = createLensesRepository()

export const reactionService = {
  validateTarget: (t: string) => {
    const valid: TargetType[] = ['thread', 'thread_reply', 'lens', 'workflow']
    if (!valid.includes(t as TargetType)) throw new Error(`Invalid target`)
  },

  getReactionSummary: async (
    targetType: TargetType,
    targetId: string,
    currentLenserId?: string
  ): Promise<ReactionSummary> => {
    reactionService.validateTarget(targetType)

    const [countsList, userReactions] = await Promise.all([
      reactionRepo.countReactions(targetType, targetId),
      currentLenserId
        ? reactionRepo.getUserReaction(targetType, targetId, currentLenserId)
        : Promise.resolve([]),
    ])

    const counts: Record<ReactionType, number> = {
      like: 0,
      love: 0,
      clap: 0,
      saved: 0,
      copy: 0,
    }
    let total = 0

    countsList.forEach((c) => {
      counts[c.reaction] = c.count
      // Exclude 'saved' and 'copy' from the generic "reaction" count shown in some UIs (like thread upvotes),
      // or customize based on UI needs. For now, 'copy' is a usage metric, 'saved' is a bookmark.
      if (c.reaction !== 'saved' && c.reaction !== 'copy') {
        total += c.count
      }
    })

    return {
      counts,
      total,
      userReactions: userReactions.map((r) => r.reaction),
    }
  },

  toggleReaction: async (
    targetType: TargetType,
    targetId: string,
    lenserId: string,
    reaction: ReactionType
  ) => {
    reactionService.validateTarget(targetType)
    return reactionRepo.toggleReaction(targetType, targetId, lenserId, reaction)
  },

  getLenserActivityFeed: async (
    lenserHandle: string,
    offset = 0,
    limit = 20
  ): Promise<ActivityFeedItem[]> => {
    const result = await reactionRepo.getLenserHistory(lenserHandle, offset, limit)
    const reactions = result.data ?? []

    const enriched = await Promise.all(
      reactions.map(async (r) => {
        let title = 'Unknown Content'

        try {
          if (r.target_type === 'thread') {
            const t = await threadsRepo.getThreadById(r.target_id)
            if (t) title = t.title
          } else if (r.target_type === 'lens') {
            const p = await lensesRepo.getById(r.target_id)
            if (p) title = p.title
          } else if (r.target_type === 'thread_reply') {
            const reply = await threadsRepo.getReplyById(r.target_id)
            if (reply) {
              title =
                reply.content.length > 60
                  ? `Reply: "${reply.content.substring(0, 60)}..."`
                  : `Reply: "${reply.content}"`
            }
          }
        } catch (e) {
          console.warn(`Failed to resolve target for reaction ${r.id}`, e)
        }

        return {
          id: r.id,
          reaction: r.reaction,
          targetType: r.target_type,
          targetId: r.target_id,
          targetTitle: title,
          createdAt: r.created_at,
        }
      })
    )

    return enriched.filter((item) => item.targetTitle !== 'Unknown Content')
  },

  // Backward compatibility alias
  getUserActivityFeed: async (lenserHandle: string, offset = 0, limit = 20) => {
    return reactionService.getLenserActivityFeed(lenserHandle, offset, limit)
  },
}
