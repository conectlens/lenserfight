// Entity document builders: glue seoService metadata + the crawlable body into a
// SeoDocument. Pure and unit-testable. seoService's input types are the full
// React view-models; our *SeoInput shapes are structural subsets (seoService
// only reads a handful of fields), so we cast at the call boundary.

import { seoService, type SEOMetadata } from './meta/seoService'
import { buildHreflang, type SeoDocument } from './renderDocument'
import { absoluteUrl, entityPath, type EntityKind } from './routes'
import {
  renderBattleBody,
  renderLensBody,
  renderLenserBody,
  renderRayBody,
  renderThreadBody,
  renderWorkflowBody,
  type BattleSeoInput,
  type LensSeoInput,
  type LenserSeoInput,
  type RaySeoInput,
  type ThreadSeoInput,
  type WorkflowSeoInput,
} from './bodies'

const BASE = 'https://moon.lenserfight.com'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArg = any

function toDoc(
  meta: SEOMetadata,
  kind: EntityKind,
  key: string,
  bodyHtml: string,
  ogType: string,
): SeoDocument {
  const canonical = meta.url ?? absoluteUrl(BASE, entityPath(kind, key))
  return { meta, canonical, hreflang: buildHreflang(canonical), bodyHtml, ogType, locale: 'en' }
}

export function buildLensDocument(e: LensSeoInput): SeoDocument {
  return toDoc(seoService.getPromptMeta(e as AnyArg), 'lens', e.id, renderLensBody(e), 'article')
}

export function buildBattleDocument(e: BattleSeoInput): SeoDocument {
  return toDoc(seoService.getBattleMeta(e as AnyArg), 'battle', e.slug, renderBattleBody(e), 'article')
}

export function buildLenserDocument(e: LenserSeoInput): SeoDocument {
  const meta = seoService.getProfileMeta(e as AnyArg, (e.stats ?? null) as AnyArg)
  return toDoc(meta, 'lenser', e.handle, renderLenserBody(e), 'profile')
}

export function buildWorkflowDocument(e: WorkflowSeoInput): SeoDocument {
  return toDoc(seoService.getWorkflowMeta(e as AnyArg), 'workflow', e.id, renderWorkflowBody(e), 'website')
}

export function buildThreadDocument(e: ThreadSeoInput): SeoDocument {
  return toDoc(seoService.getThreadMeta(e as AnyArg), 'thread', e.id, renderThreadBody(e), 'article')
}

export function buildRayDocument(e: RaySeoInput): SeoDocument {
  return toDoc(seoService.getTagMeta(e as AnyArg), 'ray', e.slug, renderRayBody(e), 'website')
}
