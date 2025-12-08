
import { MentionParser, ContentSegment } from '../utils/mentionParser';
import { promptsService } from './promptsService';

export interface ResolvedSegment {
  type: 'text' | 'mention';
  content: string; // The display text (e.g. "Prompt Title" or raw text)
  id?: string;
  entityType?: string;
  link?: string;
  isValid?: boolean;
}

/**
 * Service responsible for hydrating mention tokens with actual entity data.
 * Adheres to High Cohesion by grouping resolution logic here.
 */
export const mentionService = {
  
  resolveContent: async (rawContent: string): Promise<ResolvedSegment[]> => {
    const segments = MentionParser.parseSegments(rawContent);
    
    const resolutionPromises = segments.map(async (segment) => {
      if (segment.type === 'text') {
        return {
          type: 'text',
          content: segment.content
        } as ResolvedSegment;
      }

      if (segment.type === 'mention') {
        try {
          switch (segment.entityType) {
            case 'Prompt':
              const prompt = await promptsService.getPromptDetail(segment.id);
              if (prompt) {
                return {
                  type: 'mention',
                  content: prompt.title,
                  id: segment.id,
                  entityType: 'Prompt',
                  link: `/len/p/${segment.id}`,
                  isValid: true
                } as ResolvedSegment;
              }
              break;
            // Future cases...
          }

          // Fallback if entity not found
          return {
            type: 'mention',
            content: `Unknown ${segment.entityType}`,
            id: segment.id,
            entityType: segment.entityType,
            isValid: false
          } as ResolvedSegment;

        } catch (error) {
           // Fallback on error (e.g. 404)
           return {
            type: 'mention',
            content: `Unknown ${segment.entityType}`,
            id: segment.id,
            entityType: segment.entityType,
            isValid: false
          } as ResolvedSegment;
        }
      }

      return { type: 'text', content: '' } as ResolvedSegment;
    });

    return Promise.all(resolutionPromises);
  }
};
