import { getTagRepository } from '../adapters/tagAdapter'
import { TagActivityEventDTO, ContentType } from '../types/tags.types'

const tagRepo = getTagRepository()

export const tagActivityService = {
  /**
   * Records a 'viewed' event for a specific tag and entity.
   */
  recordView: async (tagId: string, entityType: ContentType, entityId: string, userId?: string) => {
    await tagActivityService.recordActivity(tagId, entityType, entityId, userId, 'viewed')
  },

  /**
   * Records a 'reacted' event.
   */
  recordReaction: async (
    tagId: string,
    entityType: ContentType,
    entityId: string,
    userId?: string
  ) => {
    await tagActivityService.recordActivity(tagId, entityType, entityId, userId, 'reacted')
  },

  /**
   * Generic recorder
   */
  recordActivity: async (
    tagId: string,
    entityType: ContentType,
    entityId: string,
    userId?: string,
    type: 'created' | 'viewed' | 'reacted' = 'viewed'
  ) => {
    const event: TagActivityEventDTO = {
      tag_id: tagId,
      entity_type: entityType,
      entity_id: entityId,
      activity_type: type,
      actor_id: userId,
    }
    await tagRepo.recordActivity(event)
  },

  /**
   * Records multiple view events efficiently in one transaction.
   * Used by controllers on page load.
   */
  recordBatchView: async (
    tagIds: string[],
    entityType: ContentType,
    entityId: string,
    userId?: string
  ) => {
    if (!tagIds || tagIds.length === 0) return

    const events: TagActivityEventDTO[] = tagIds.map((tagId) => ({
      tag_id: tagId,
      entity_type: entityType,
      entity_id: entityId,
      activity_type: 'viewed',
      actor_id: userId,
    }))

    await tagRepo.recordBatchActivity(events)
  },

  /**
   * Records a batch of arbitrary activity events.
   */
  recordBatchActivity: async (events: TagActivityEventDTO[]) => {
    if (!events || events.length === 0) return
    await tagRepo.recordBatchActivity(events)
  },
}
