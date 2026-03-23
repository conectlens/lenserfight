import { lensesService } from '@lenserfight/data/repositories'
import {
  TagContentProvider,
  TaggedContentItem,
  SortOption,
  ContentType,
} from '@lenserfight/types'

export class PromptTagProvider implements TagContentProvider {
  type: ContentType = 'lens'
  label = 'Lenses'

  async listByTag(
    tagSlug: string,
    sort: SortOption,
    currentLenserId?: string,
    offset = 0,
    limit = 20,
  ): Promise<TaggedContentItem[]> {
    const result = await lensesService.filter(tagSlug, offset, limit, sort)
    const prompts = result.data ?? []

    return prompts.map((p) => ({
      id: p.id,
      type: 'lens',
      title: p.title,
      description: p.description || undefined,
      createdAt: p.createdAt,
      author: {
        id: p.author.id,
        displayName: p.author.displayName,
        handle: p.author.handle,
        avatarUrl: p.author.avatarUrl,
      },
      stats: {
        uses: p.usageCount,
      },
      data: p,
    }))
  }
}
