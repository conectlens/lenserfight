import { threadsService } from '@lenserfight/data/repositories'
import {
  TagContentProvider,
  TaggedContentItem,
  SortOption,
  ContentType,
} from '@lenserfight/types'

export class ThreadTagProvider implements TagContentProvider {
  type: ContentType = 'thread'
  label = 'Threads'

  async listByTag(
    tagSlug: string,
    sort: SortOption,
    currentLenserId?: string,
    offset = 0,
    limit = 20,
  ): Promise<TaggedContentItem[]> {
    const result = await threadsService.getThreadsByTag(tagSlug, sort, currentLenserId, offset, limit)
    const threads = result.data ?? []

    return threads.map((t) => ({
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
