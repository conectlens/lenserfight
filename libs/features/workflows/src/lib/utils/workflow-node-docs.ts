import { DOCS_BASE_URL } from '@lenserfight/utils/env'

/** Matches a leading /{locale}/ segment (e.g. /en/, /tr/, /zh-CN/) */
const LOCALE_PREFIX_RE = /^\/[a-z]{2}(-[A-Z]{2})?\//

/**
 * Builds a fully-qualified docs URL for a workflow node.
 *
 * `docsPath` is the catalog's locale-agnostic path, e.g.:
 *   '/reference/workflows/nodes/trigger#manual-trigger'
 *
 * Legacy paths that start with '/docs/workflows/nodes/' are placeholders with
 * no published page — this function returns `null` for those so callers can
 * hide the docs button rather than open a broken link.
 *
 * If `docsPath` already contains an embedded locale prefix (e.g. '/en/…') it
 * is stripped and replaced with the caller's active locale.
 *
 * @example
 *   getWorkflowNodeDocsHref('/reference/workflows/nodes/trigger#manual-trigger', 'tr')
 *   // → 'https://docs.lenserfight.com/tr/reference/workflows/nodes/trigger#manual-trigger'
 */
export function getWorkflowNodeDocsHref(
  docsPath: string | null | undefined,
  locale: string,
): string | null {
  if (!docsPath) return null
  // Reject old placeholder paths — no published page exists for these
  if (docsPath.startsWith('/docs/workflows/nodes/')) return null
  // Strip any embedded locale prefix and replace with the caller's locale
  const canonical = docsPath.replace(LOCALE_PREFIX_RE, '/')
  return `${DOCS_BASE_URL}/${locale}${canonical}`
}
