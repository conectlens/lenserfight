import { seoService } from '@lenserfight/data/repositories'
import type {
  Lenser,
  LenserStats,
  LensDetailViewModel,
  TagUsage,
  ThreadDetailViewModel,
} from '@lenserfight/types'
import {
  renderBattleBody,
  renderLensBody,
  renderLenserBody,
  renderRayBody,
  renderThreadBody,
  renderWorkflowBody,
} from './bodies/entities'
import type { BattleSeoInput, HreflangAlternate, SeoDocument, WorkflowSeoInput } from './types'

const FORUM_HOST = 'https://moon.lenserfight.com'

export interface BuildContext {
  /** BCP-47 locale for the rendered document. Defaults to 'en'. */
  locale?: string
}

/**
 * Emit `en`, `tr`, and `x-default` alternates for a canonical URL, mirroring the
 * localization signal used across the existing sitemap.
 */
export function buildHreflang(canonical: string): HreflangAlternate[] {
  const sep = canonical.includes('?') ? '&' : '?'
  return [
    { lang: 'en', href: canonical },
    { lang: 'tr', href: `${canonical}${sep}lang=tr` },
    { lang: 'x-default', href: canonical },
  ]
}

function assemble(
  meta: ReturnType<typeof seoService.getHomeMeta>,
  bodyHtml: string,
  locale: string,
): SeoDocument {
  const canonical = meta.url ?? FORUM_HOST
  return { meta, canonical, locale, hreflang: buildHreflang(canonical), bodyHtml }
}

export function buildLensDocument(vm: LensDetailViewModel, ctx: BuildContext = {}): SeoDocument {
  const bodyHtml = renderLensBody({
    title: vm.title,
    description: vm.description,
    authorName: vm.author.displayName,
    authorHandle: vm.author.handle,
    tags: vm.tags,
    usageCount: vm.usageCount,
  })
  return assemble(seoService.getPromptMeta(vm), bodyHtml, ctx.locale ?? 'en')
}

export function buildBattleDocument(input: BattleSeoInput, ctx: BuildContext = {}): SeoDocument {
  const bodyHtml = renderBattleBody({
    title: input.title,
    taskPrompt: input.task_prompt,
    totalVotes: input.total_vote_count,
    authorName: input.author_display_name,
    authorHandle: input.author_handle,
  })
  return assemble(seoService.getBattleMeta(input), bodyHtml, ctx.locale ?? 'en')
}

export function buildLenserDocument(
  arg: { lenser: Lenser; stats?: LenserStats | null },
  ctx: BuildContext = {},
): SeoDocument {
  const { lenser, stats } = arg
  const bodyHtml = renderLenserBody({
    handle: lenser.handle,
    displayName: lenser.display_name,
    headline: lenser.headline,
    promptsCount: stats?.promptsCount,
    threadsCount: stats?.threadsCount,
    followersCount: stats?.followersCount,
  })
  return assemble(seoService.getProfileMeta(lenser, stats), bodyHtml, ctx.locale ?? 'en')
}

export function buildWorkflowDocument(input: WorkflowSeoInput, ctx: BuildContext = {}): SeoDocument {
  const bodyHtml = renderWorkflowBody({
    title: input.title,
    description: input.description,
    authorName: input.author_display_name,
    authorHandle: input.author_handle,
    nodeCount: input.node_count,
  })
  return assemble(seoService.getWorkflowMeta(input), bodyHtml, ctx.locale ?? 'en')
}

export function buildThreadDocument(vm: ThreadDetailViewModel, ctx: BuildContext = {}): SeoDocument {
  const bodyHtml = renderThreadBody({
    title: vm.title,
    authorName: vm.author.displayName,
    authorHandle: vm.author.handle,
    tags: vm.tags,
    replyCount: vm.replies?.length,
  })
  return assemble(seoService.getThreadMeta(vm), bodyHtml, ctx.locale ?? 'en')
}

export function buildRayDocument(tag: TagUsage, ctx: BuildContext = {}): SeoDocument {
  const bodyHtml = renderRayBody({ slug: tag.slug, name: tag.name, count: tag.count })
  return assemble(seoService.getTagMeta(tag), bodyHtml, ctx.locale ?? 'en')
}
