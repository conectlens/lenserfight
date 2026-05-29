/**
 * CLI data facade — mirrors `threadsService.getPersonalFeed` / `threadsRepository`.
 */
import type { PersonalFeedItem } from '@lenserfight/types'
import { callRpc } from '../../utils/api'

type PersonalThreadRow = {
  id: string
  title: string
  content?: string
  personal_score?: number
  hot_score?: number
  primary_language?: string
  reply_count?: number
  created_at?: string
  author_profile?: Record<string, unknown>
  tags?: unknown
  reaction_totals?: Record<string, number>
}

function mapPersonalThreadRow(row: PersonalThreadRow): PersonalFeedItem {
  const author = row.author_profile ?? {}
  const reactionTotals = row.reaction_totals ?? {}
  return {
    id: row.id,
    title: row.title,
    content: row.content ?? '',
    author: {
      id: String(author.id ?? ''),
      displayName: String(author.display_name ?? 'Unknown'),
      handle: String(author.handle ?? 'unknown'),
      avatarUrl: (author.avatar_url as string | null) ?? null,
    },
    tags: [],
    reactionCount: Object.values(reactionTotals).reduce((sum, n) => sum + n, 0),
    replyCount: row.reply_count ?? 0,
    createdAt: row.created_at ?? '',
    userHasReacted: false,
    visibility: 'public',
    status: 'published',
    hotScore: row.hot_score,
    primaryLanguage: row.primary_language,
    personalScore: row.personal_score ?? 0,
  }
}

/** Personalized thread feed (`fn_content_get_personal_threads`). Auth user from JWT. */
export async function getPersonalFeed(
  offset = 0,
  limit = 20,
): Promise<PersonalFeedItem[]> {
  const rows = await callRpc<PersonalThreadRow[]>(
    'fn_content_get_personal_threads',
    { p_limit: limit, p_offset: offset },
    { requireAuth: true },
  )
  return (Array.isArray(rows) ? rows : []).map(mapPersonalThreadRow)
}
