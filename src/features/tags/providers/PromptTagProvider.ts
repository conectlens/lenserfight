
import { TagContentProvider, TaggedContentItem, SortOption, ContentType } from '../../../types/tags.types';
import { promptsService } from '../../../services/promptsService';

export class PromptTagProvider implements TagContentProvider {
  type: ContentType = 'prompt';
  label = 'Prompts';

  async listByTag(tagSlug: string, sort: SortOption, currentLenserId?: string): Promise<TaggedContentItem[]> {
    // Pass currentLenserId to filter so owners can see their private tagged prompts
    const prompts = await promptsService.filter(tagSlug, currentLenserId);
    
    const sorted = [...prompts];
    if (sort === 'newest') {
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
        // Popular / Trending map to usage count for prompts
        sorted.sort((a, b) => b.usageCount - a.usageCount);
    }

    return sorted.map(p => ({
      id: p.id,
      type: 'prompt',
      title: p.title,
      description: p.description || undefined,
      createdAt: p.createdAt,
      author: {
        id: p.author.id,
        displayName: p.author.displayName,
        handle: p.author.handle,
        avatarUrl: p.author.avatarUrl
      },
      stats: {
        uses: p.usageCount
      },
      data: p
    }));
  }
}
