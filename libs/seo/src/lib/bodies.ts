// Crawlable HTML bodies for each public entity. All fields are HTML-escaped
// (user content is untrusted). Internal <a href> links let crawlers walk the
// entity graph (author → profile, tags → rays, etc.). Input shapes are the
// subset of each entity's view-model that seoService + the body need, so the
// detail fetchers can map RPC rows into them directly.

import { escapeAttr, escapeHtml } from './html'
import { entityPath } from './routes'

const BASE = 'https://moon.lenserfight.com'

export interface Fact {
  label: string
  value: string | number | null | undefined
}
export interface BodyLink {
  href: string
  label: string
}
export interface EntityBodyInput {
  h1: string
  summary?: string | null
  facts?: Fact[]
  sections?: Array<{ heading?: string; text: string }>
  links?: BodyLink[]
}

/** Shared body renderer: <h1>, summary, a <dl> of facts, prose sections, and a link nav. */
export function renderEntityBody(input: EntityBodyInput): string {
  const parts: string[] = [`    <h1>${escapeHtml(input.h1)}</h1>`]
  if (input.summary) parts.push(`    <p>${escapeHtml(input.summary)}</p>`)

  const facts = (input.facts ?? []).filter(
    (f) => f.value !== null && f.value !== undefined && `${f.value}` !== '',
  )
  if (facts.length) {
    parts.push('    <dl>')
    for (const f of facts) {
      parts.push(`      <dt>${escapeHtml(f.label)}</dt><dd>${escapeHtml(String(f.value))}</dd>`)
    }
    parts.push('    </dl>')
  }

  for (const s of input.sections ?? []) {
    if (s.text?.trim()) {
      if (s.heading) parts.push(`    <h2>${escapeHtml(s.heading)}</h2>`)
      parts.push(`    <p>${escapeHtml(s.text)}</p>`)
    }
  }

  const links = input.links ?? []
  if (links.length) {
    parts.push('    <nav aria-label="Related"><ul>')
    for (const l of links) {
      parts.push(`      <li><a href="${escapeAttr(l.href)}">${escapeHtml(l.label)}</a></li>`)
    }
    parts.push('    </ul></nav>')
  }
  return parts.join('\n')
}

// ── Entity input shapes ──────────────────────────────────────────────────────

export interface Tagish {
  name: string
  slug: string
}

export interface LensSeoInput {
  id: string
  title: string
  description?: string | null
  author: { displayName: string; handle: string; avatarUrl?: string | null }
  tags?: Tagish[]
  usageCount?: number
  createdAt?: string
  status?: string
  outputKind?: string
  reactionCounts?: Record<string, number>
}

export interface BattleSeoInput {
  id: string
  slug: string
  title: string
  task_prompt?: string
  published_at?: string | null
  og_image_url?: string | null
  total_vote_count?: number
  contender_count?: number
}

export interface LenserSeoInput {
  id?: string
  handle: string
  display_name: string
  headline?: string | null
  bio?: string | null
  type?: string
  avatar_url?: string | null
  website_url?: string | null
  stats?: { promptsCount?: number; threadsCount?: number; followersCount?: number }
}

export interface WorkflowSeoInput {
  id: string
  title: string
  description?: string | null
  visibility?: string
  author?: { displayName?: string; handle?: string }
  node_count?: number
}

export interface ThreadSeoInput {
  id: string
  title: string
  content?: string | null
  author: { displayName: string; handle: string }
  tags?: Tagish[]
  createdAt?: string
  replyCount?: number
  reactionCount?: number
}

export interface RaySeoInput {
  name: string
  slug: string
  count?: number
  description?: string | null
}

// ── Per-entity bodies ────────────────────────────────────────────────────────

function tagLinks(tags?: Tagish[]): BodyLink[] {
  return (tags ?? []).map((t) => ({ href: `${BASE}${entityPath('ray', t.slug)}`, label: `#${t.name}` }))
}
function authorLink(handle?: string, name?: string): BodyLink[] {
  return handle ? [{ href: `${BASE}${entityPath('lenser', handle)}`, label: `by ${name ?? handle}` }] : []
}

export function renderLensBody(e: LensSeoInput): string {
  return renderEntityBody({
    h1: e.title,
    summary: e.description,
    facts: [
      { label: 'Author', value: e.author.displayName },
      { label: 'Uses', value: e.usageCount },
      { label: 'Output', value: e.outputKind },
      { label: 'Tags', value: e.tags?.map((t) => t.name).join(', ') },
      { label: 'Created', value: e.createdAt?.split('T')[0] },
    ],
    links: [...authorLink(e.author.handle, e.author.displayName), ...tagLinks(e.tags)],
  })
}

export function renderBattleBody(e: BattleSeoInput): string {
  return renderEntityBody({
    h1: e.title,
    summary: e.task_prompt,
    facts: [
      { label: 'Contenders', value: e.contender_count },
      { label: 'Votes', value: e.total_vote_count },
      { label: 'Published', value: e.published_at?.split('T')[0] },
    ],
    links: [{ href: `${BASE}${entityPath('battle', e.slug)}/result`, label: 'Battle results' }],
  })
}

export function renderLenserBody(e: LenserSeoInput): string {
  return renderEntityBody({
    h1: `${e.display_name} (@${e.handle})`,
    summary: e.headline ?? e.bio,
    facts: [
      { label: 'Type', value: e.type === 'ai' ? 'AI Lenser' : 'Lenser' },
      { label: 'Lenses', value: e.stats?.promptsCount },
      { label: 'Threads', value: e.stats?.threadsCount },
      { label: 'Followers', value: e.stats?.followersCount },
    ],
    links: e.website_url ? [{ href: e.website_url, label: 'Website' }] : [],
  })
}

export function renderWorkflowBody(e: WorkflowSeoInput): string {
  return renderEntityBody({
    h1: e.title,
    summary: e.description,
    facts: [
      { label: 'Author', value: e.author?.displayName ?? e.author?.handle },
      { label: 'Nodes', value: e.node_count },
    ],
    links: authorLink(e.author?.handle, e.author?.displayName),
  })
}

export function renderThreadBody(e: ThreadSeoInput): string {
  return renderEntityBody({
    h1: e.title,
    summary: e.content,
    facts: [
      { label: 'Author', value: e.author.displayName },
      { label: 'Replies', value: e.replyCount },
      { label: 'Reactions', value: e.reactionCount },
      { label: 'Created', value: e.createdAt?.split('T')[0] },
    ],
    links: [...authorLink(e.author.handle, e.author.displayName), ...tagLinks(e.tags)],
  })
}

export function renderRayBody(e: RaySeoInput): string {
  return renderEntityBody({
    h1: `${e.name} — AI lenses, workflows & battles`,
    summary: e.description,
    facts: [{ label: 'Resources', value: e.count }],
    links: [
      { href: `${BASE}/lenses?ray=${encodeURIComponent(e.slug)}`, label: `${e.name} lenses` },
      { href: `${BASE}/battles/browse?ray=${encodeURIComponent(e.slug)}`, label: `${e.name} battles` },
    ],
  })
}
