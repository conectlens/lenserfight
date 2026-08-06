/**
 * CLI data facade — mirrors `threadsService.getPersonalFeed` / `threadsRepository`.
 */
import type { PersonalFeedItem } from '@lenserfight/types'
import { callRpc, callRest } from '@lenserfight/cli-client'

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

export type ThreadVisibility = 'public' | 'community' | 'private'

export interface CreateThreadInput {
  title: string
  content: string
  visibility: ThreadVisibility
  tagIds?: string[]
}

export interface CreatedThread {
  id: string
  title: string
  content: string
  visibility: string
  createdAt: string
}

type ThreadViewRow = {
  id: string
  title: string
  content: string
  visibility: string
  created_at: string
}

/**
 * Create a thread (`fn_content_create_thread`). Mirrors `threadsRepository.createThread` —
 * lenser_id is resolved server-side from the caller's JWT (SECURITY DEFINER), so
 * authorship always follows the logged-in user, not the CLI's agent workspace selection.
 */
export async function createThread(input: CreateThreadInput): Promise<CreatedThread> {
  const threadId = await callRpc<string>(
    'fn_content_create_thread',
    {
      p_title: input.title,
      p_content: input.content,
      p_visibility: input.visibility,
      p_tag_ids: input.tagIds ?? [],
    },
    { requireAuth: true },
  )

  // vw_content_threads_public only surfaces public + published threads, same
  // as the web app — private/community threads fall back to the input echo.
  const rows = await callRest<ThreadViewRow[]>(
    'public',
    'vw_content_threads_public',
    'GET',
    undefined,
    {
      query: { id: `eq.${threadId}`, select: 'id,title,content,visibility,created_at' },
      requireAuth: true,
    },
  )

  const row = rows?.[0]
  return row
    ? { id: row.id, title: row.title, content: row.content, visibility: row.visibility, createdAt: row.created_at }
    : {
        id: threadId,
        title: input.title,
        content: input.content,
        visibility: input.visibility,
        createdAt: new Date().toISOString(),
      }
}
