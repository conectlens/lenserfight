
import { getTagRepository } from '../adapters/tagAdapter';
import { TagActivityEventDTO, ContentType } from '../types/tags.types';

const tagRepo = getTagRepository();

export const tagActivityService = {
  
  /**
   * Records a 'viewed' event for a specific tag and entity.
   */
  recordView: async (tagId: string, entityType: ContentType, entityId: string, userId?: string) => {
    await tagActivityService.recordActivity(tagId, entityType, entityId, userId, 'viewed');
  },

  /**
   * Records a 'reacted' event.
   */
  recordReaction: async (tagId: string, entityType: ContentType, entityId: string, userId?: string) => {
    await tagActivityService.recordActivity(tagId, entityType, entityId, userId, 'reacted');
  },

  /**
   * Generic recorder
   */
  recordActivity: async (tagId: string, entityType: ContentType, entityId: string, userId?: string, type: 'created' | 'viewed' | 'reacted' = 'viewed') => {
      const event: TagActivityEventDTO = {
        tag_id: tagId,
        entity_type: entityType,
        entity_id: entityId,
        activity_type: type,
        actor_id: userId
      };
      await tagRepo.recordActivity(event);
  }
};
