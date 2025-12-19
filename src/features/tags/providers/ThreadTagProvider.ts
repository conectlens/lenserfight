import { threadsService } from '../../../services/threadsService'
import {
  TagContentProvider,
  TaggedContentItem,
  SortOption,
  ContentType,
} from '../../../types/tags.types'

export class ThreadTagProvider implements TagContentProvider {
  type: ContentType = 'thread'
  label = 'Threads'

  async listByTag(
    tagSlug: string,
    sort: SortOption,
    currentLenserId?: string
  ): Promise<TaggedContentItem[]> {
    // Threads service might use currentLenserId for reaction state in the future, passing it through is good practice
    // Fetch up to 50 threads to populate the grid adequately
    const threads = await threadsService.getThreadsByTag(tagSlug, currentLenserId, 0, 50)

    const sorted = [...threads]
    if (sort === 'newest') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (sort === 'popular' || sort === 'trending') {
      // For threads, Trending roughly equals Popular (reactions) in this context
      // unless we have specific per-thread velocity data
      sorted.sort((a, b) => b.reactionCount - a.reactionCount)
    }

    return sorted.map((t) => ({
      id: t.id,
      type: 'thread',
      title: t.title,
      description: t.content, // Threads use content excerpt
      createdAt: t.createdAt,
      author: {
        id: t.author.id,
        displayName: t.author.displayName,
        handle: t.author.handle,
        avatarUrl: t.author.avatarUrl,
      },
      stats: {
        likes: t.reactionCount,
        replies: t.replyCount,
      },
      data: t,
    }))
  }
}
