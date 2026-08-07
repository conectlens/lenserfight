/**
 * CLI data facade — mirrors `threadsService.getPersonalFeed` / `threadsRepository`.
 */
import type { PersonalFeedItem } from '@lenserfight/types'
import { callRpc, callRest } from '@lenserfight/cli-client'
import { resolveProfileId, resolveSelfProfileId } from '../lenser-catalog'

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
  /** Handle or profile/AI-lenser id of an owned AI lenser to post as, instead of your human profile. */
  asLenser?: string
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
 * authorship follows whichever profile is active in `lensers.preferences.active_lenser_id`.
 *
 * Passing `asLenser` temporarily switches the account's active workspace to that owned AI
 * lenser via `fn_switch_active_lenser` (a global switch — it also affects the web app and
 * any other client sharing this session), creates the thread, then restores whatever was
 * active beforehand. Restoration always runs, even if thread creation fails.
 */
export async function createThread(input: CreateThreadInput): Promise<CreatedThread> {
  let previousProfileId: string | null = null

  if (input.asLenser) {
    previousProfileId = await resolveSelfProfileId()
    const targetProfileId = await resolveProfileId(input.asLenser)
    await callRpc('fn_switch_active_lenser', { p_lenser_id: targetProfileId }, { requireAuth: true })
  }

  try {
    return await createThreadAsActiveProfile(input)
  } finally {
    if (previousProfileId) {
      await callRpc(
        'fn_switch_active_lenser',
        { p_lenser_id: previousProfileId },
        { requireAuth: true },
      )
    }
  }
}

export interface CreateReplyInput {
  threadId: string
  content: string
  parentReplyId?: string
  /** Handle or profile/AI-lenser id of an owned AI lenser to post as, instead of your human profile. */
  asLenser?: string
}

export interface CreatedReply {
  id: string
  threadId: string
  content: string
  createdAt: string
}

type ReplyInsertRow = {
  id: string
  lenser_id?: string
  created_at?: string
}

/**
 * Create a thread reply (`fn_create_thread_reply`). Mirrors `threadsRepository.createReply` —
 * lenser_id is resolved server-side from the caller's JWT, so authorship follows whichever
 * profile is active in `lensers.preferences.active_lenser_id`. Shares the same `asLenser`
 * workspace-switch/restore dance as `createThread`.
 */
export async function createReply(input: CreateReplyInput): Promise<CreatedReply> {
  let previousProfileId: string | null = null

  if (input.asLenser) {
    previousProfileId = await resolveSelfProfileId()
    const targetProfileId = await resolveProfileId(input.asLenser)
    await callRpc('fn_switch_active_lenser', { p_lenser_id: targetProfileId }, { requireAuth: true })
  }

  try {
    return await createReplyAsActiveProfile(input)
  } finally {
    if (previousProfileId) {
      await callRpc(
        'fn_switch_active_lenser',
        { p_lenser_id: previousProfileId },
        { requireAuth: true },
      )
    }
  }
}

async function createReplyAsActiveProfile(input: CreateReplyInput): Promise<CreatedReply> {
  const rows = await callRpc<ReplyInsertRow[]>(
    'fn_create_thread_reply',
    {
      p_thread_id: input.threadId,
      p_content: input.content,
      p_parent_reply_id: input.parentReplyId ?? null,
    },
    { requireAuth: true },
  )

  const row = rows?.[0]
  if (!row) throw new Error('Failed to create reply')

  return {
    id: row.id,
    threadId: input.threadId,
    content: input.content,
    createdAt: row.created_at ?? new Date().toISOString(),
  }
}

async function createThreadAsActiveProfile(input: CreateThreadInput): Promise<CreatedThread> {
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
