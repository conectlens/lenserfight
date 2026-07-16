// Fetches one public entity via its anon detail RPC, maps the row into the
// builder input, and serializes a bot HTML document. Returns null when the
// entity is missing/not public (→ Worker 404). Used as createSeoWorker's
// `renderEntity` hook.
//
// VERIFY IN ENV: the RPC parameter names and row field names below are the
// documented/expected shapes. If a name differs, the RPC call throws and the
// Worker degrades to the SPA shell (no crash) — correct the mapping here. The
// sitemap path is unaffected by any mismatch.

import {
  buildBattleDocument,
  buildLensDocument,
  buildLenserDocument,
  buildRayDocument,
  buildThreadDocument,
  buildWorkflowDocument,
} from '../builders'
import { renderBotHtml } from '../renderDocument'
import { fetchOne, type SupabaseAnonConfig } from '../fetchers'
import type {
  BattleSeoInput,
  LensSeoInput,
  LenserSeoInput,
  RaySeoInput,
  ThreadSeoInput,
  Tagish,
  WorkflowSeoInput,
} from '../bodies'
import type { EntityKind } from '../routes'

type Row = Record<string, unknown>
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined)

function mapTags(v: unknown): Tagish[] {
  if (!Array.isArray(v)) return []
  return v
    .map((t) => {
      const o = t as Row
      const name = str(o?.name) ?? str(o?.tag_name)
      const slug = str(o?.slug) ?? str(o?.tag_slug)
      return name && slug ? { name, slug } : null
    })
    .filter((t): t is Tagish => t !== null)
}

// Author can arrive nested ({author:{...}}) or flattened (author_handle, ...).
function mapAuthor(row: Row): { displayName: string; handle: string; avatarUrl?: string | null } {
  const a = (row.author ?? {}) as Row
  return {
    displayName: str(a.displayName) ?? str(a.display_name) ?? str(row.author_display_name) ?? str(row.display_name) ?? 'Lenser',
    handle: str(a.handle) ?? str(row.author_handle) ?? str(row.handle) ?? '',
    avatarUrl: str(a.avatarUrl) ?? str(a.avatar_url) ?? str(row.author_avatar_url) ?? null,
  }
}

const DETAIL: Record<
  EntityKind,
  { fn: string; arg: (key: string) => Row; build: (row: Row, key: string) => string }
> = {
  lens: {
    fn: 'fn_get_lens_detail_bootstrap',
    arg: (k) => ({ p_lens_id: k }),
    build: (row, k) => {
      const input: LensSeoInput = {
        id: str(row.id) ?? k,
        title: str(row.title) ?? 'Lens',
        description: str(row.description),
        author: mapAuthor(row),
        tags: mapTags(row.tags),
        usageCount: num(row.usageCount) ?? num(row.usage_count) ?? 0,
        createdAt: str(row.createdAt) ?? str(row.created_at),
        status: str(row.status),
        outputKind: str(row.outputKind) ?? str(row.output_kind),
      }
      return renderBotHtml(buildLensDocument(input))
    },
  },
  battle: {
    fn: 'fn_get_battle_by_slug',
    arg: (k) => ({ p_slug: k }),
    build: (row, k) => {
      const input: BattleSeoInput = {
        id: str(row.id) ?? k,
        slug: str(row.slug) ?? k,
        title: str(row.title) ?? 'Battle',
        task_prompt: str(row.task_prompt),
        published_at: str(row.published_at) ?? null,
        og_image_url: str(row.og_image_url) ?? null,
        total_vote_count: num(row.total_vote_count),
        contender_count: num(row.contender_count),
      }
      return renderBotHtml(buildBattleDocument(input))
    },
  },
  lenser: {
    fn: 'fn_get_lenser_profile_full',
    arg: (k) => ({ p_handle: k }),
    build: (row, k) => {
      const input: LenserSeoInput = {
        id: str(row.id),
        handle: str(row.handle) ?? k,
        display_name: str(row.display_name) ?? str(row.displayName) ?? k,
        headline: str(row.headline),
        bio: str(row.bio),
        type: str(row.type),
        avatar_url: str(row.avatar_url),
        website_url: str(row.website_url),
        stats: {
          promptsCount: num(row.prompt_count) ?? num(row.promptsCount),
          threadsCount: num(row.thread_count) ?? num(row.threadsCount),
          followersCount: num(row.follower_count) ?? num(row.followersCount),
        },
      }
      return renderBotHtml(buildLenserDocument(input))
    },
  },
  workflow: {
    fn: 'fn_get_workflow_detail',
    arg: (k) => ({ p_workflow_id: k }),
    build: (row, k) => {
      const author = (row.author_profile ?? {}) as Row
      const input: WorkflowSeoInput = {
        id: str(row.id) ?? k,
        title: str(row.title) ?? 'Workflow',
        description: str(row.description),
        visibility: str(row.visibility) ?? 'public',
        node_count: num(row.node_count),
        author: {
          handle: str(author.handle) ?? str(row.author_handle),
          displayName: str(author.display_name) ?? str(row.author_display_name),
        },
      }
      return renderBotHtml(buildWorkflowDocument(input))
    },
  },
  thread: {
    fn: 'fn_get_thread_public',
    arg: (k) => ({ p_thread_id: k }),
    build: (row, k) => {
      const input: ThreadSeoInput = {
        id: str(row.id) ?? k,
        title: str(row.title) ?? 'Discussion',
        content: str(row.body_preview) ?? str(row.content),
        author: mapAuthor(row),
        tags: mapTags(row.tags),
        createdAt: str(row.created_at) ?? str(row.createdAt),
        replyCount: num(row.reply_count),
        reactionCount: num(row.reaction_count),
      }
      return renderBotHtml(buildThreadDocument(input))
    },
  },
  ray: {
    fn: 'fn_content_tags_get_by_slug',
    arg: (k) => ({ p_slug: k }),
    build: (row, k) => {
      const input: RaySeoInput = {
        name: str(row.name) ?? k,
        slug: str(row.slug) ?? k,
        count: num(row.count) ?? num(row.usage_count),
        description: str(row.description),
      }
      return renderBotHtml(buildRayDocument(input))
    },
  },
}

/** createSeoWorker `renderEntity` hook: returns bot HTML, or null (missing/private → 404). */
export async function renderEntity(
  kind: EntityKind,
  key: string,
  ctx: { anon: SupabaseAnonConfig },
): Promise<string | null> {
  const spec = DETAIL[kind]
  if (!spec) return null
  const row = await fetchOne(ctx.anon, spec.fn, spec.arg(key))
  if (!row) return null
  return spec.build(row, key)
}
