import { EntityFact, EntityLink, renderEntityBody } from './shared'

/**
 * Per-entity crawlable body renderers. Each takes a small, explicit input shape
 * (mapped from the app's view models by the builders) so these renderers stay
 * decoupled from the full domain types and touch only fields known to exist.
 */

interface Tagish {
  name: string
  slug?: string
}

function tagLinks(tags: Tagish[] | undefined): EntityLink[] {
  return (tags ?? []).map((t) => ({
    href: `/ray/${t.slug ?? encodeURIComponent(t.name)}`,
    label: `#${t.name}`,
  }))
}

function authorLink(handle: string | null | undefined, name: string): EntityLink[] {
  return handle ? [{ href: `/lenser/${handle}`, label: `By ${name}` }] : []
}

// ---- Lens -----------------------------------------------------------------

export interface LensBodyInput {
  title: string
  description?: string | null
  authorName: string
  authorHandle?: string | null
  tags?: Tagish[]
  usageCount?: number
}

export function renderLensBody(e: LensBodyInput): string {
  const facts: EntityFact[] = [{ label: 'Author', value: e.authorName }]
  if (typeof e.usageCount === 'number') facts.push({ label: 'Uses', value: String(e.usageCount) })
  if (e.tags?.length) facts.push({ label: 'Tags', value: e.tags.map((t) => t.name).join(', ') })
  return renderEntityBody({
    h1: e.title,
    summary:
      e.description ??
      `The "${e.title}" AI lens template by ${e.authorName} on LenserFight — copy, remix, and connect it into workflows, battles, and agent runs.`,
    facts,
    links: [...authorLink(e.authorHandle, e.authorName), ...tagLinks(e.tags)],
  })
}

// ---- Battle ---------------------------------------------------------------

export interface BattleBodyInput {
  title: string
  taskPrompt: string
  totalVotes?: number
  authorName?: string | null
  authorHandle?: string | null
}

export function renderBattleBody(e: BattleBodyInput): string {
  const facts: EntityFact[] = []
  if (e.authorName) facts.push({ label: 'Host', value: e.authorName })
  if (typeof e.totalVotes === 'number') facts.push({ label: 'Votes', value: String(e.totalVotes) })
  return renderEntityBody({
    h1: e.title,
    summary: `AI battle on LenserFight: ${e.title}. ${e.taskPrompt}`,
    facts,
    links: authorLink(e.authorHandle, e.authorName ?? 'the host'),
  })
}

// ---- Lenser profile -------------------------------------------------------

export interface LenserBodyInput {
  handle: string
  displayName: string
  headline?: string | null
  promptsCount?: number
  threadsCount?: number
  followersCount?: number
}

export function renderLenserBody(e: LenserBodyInput): string {
  const facts: EntityFact[] = []
  if (typeof e.promptsCount === 'number') facts.push({ label: 'Lenses', value: String(e.promptsCount) })
  if (typeof e.threadsCount === 'number') facts.push({ label: 'Threads', value: String(e.threadsCount) })
  if (typeof e.followersCount === 'number')
    facts.push({ label: 'Followers', value: String(e.followersCount) })
  return renderEntityBody({
    h1: `${e.displayName} (@${e.handle})`,
    summary:
      e.headline ??
      `${e.displayName} on LenserFight — public AI lenses, workflows, battles, and community contributions.`,
    facts,
    links: [
      { href: `/lenser/${e.handle}/wf`, label: 'Workflows' },
      { href: `/lenser/${e.handle}/followers`, label: 'Followers' },
    ],
  })
}

// ---- Thread ---------------------------------------------------------------

export interface ThreadBodyInput {
  title: string
  authorName: string
  authorHandle?: string | null
  tags?: Tagish[]
  replyCount?: number
}

export function renderThreadBody(e: ThreadBodyInput): string {
  const facts: EntityFact[] = [{ label: 'Author', value: e.authorName }]
  if (typeof e.replyCount === 'number') facts.push({ label: 'Replies', value: String(e.replyCount) })
  return renderEntityBody({
    h1: e.title,
    summary: `Community discussion on LenserFight started by ${e.authorName}: ${e.title}.`,
    facts,
    links: [...authorLink(e.authorHandle, e.authorName), ...tagLinks(e.tags)],
  })
}

// ---- Workflow -------------------------------------------------------------

export interface WorkflowBodyInput {
  title: string
  description?: string | null
  authorName?: string | null
  authorHandle?: string | null
  nodeCount?: number
}

export function renderWorkflowBody(e: WorkflowBodyInput): string {
  const facts: EntityFact[] = []
  if (e.authorName) facts.push({ label: 'Author', value: e.authorName })
  if (typeof e.nodeCount === 'number') facts.push({ label: 'Steps', value: String(e.nodeCount) })
  return renderEntityBody({
    h1: e.title,
    summary:
      e.description ??
      `A multi-step AI workflow on LenserFight: ${e.title}. Explore the node graph, fork it, and run it with your own models.`,
    facts,
    links: authorLink(e.authorHandle, e.authorName ?? 'the builder'),
  })
}

// ---- Ray / tag ------------------------------------------------------------

export interface RayBodyInput {
  slug: string
  name: string
  count?: number
  relatedLinks?: EntityLink[]
}

export function renderRayBody(e: RayBodyInput): string {
  const facts: EntityFact[] = []
  if (typeof e.count === 'number') facts.push({ label: 'Tagged items', value: String(e.count) })
  return renderEntityBody({
    h1: `#${e.name}`,
    summary: `Explore public AI lenses, workflows, battles, and threads tagged #${e.name} on LenserFight.`,
    facts,
    links: e.relatedLinks ?? [],
  })
}
