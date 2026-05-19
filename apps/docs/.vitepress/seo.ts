/**
 * Centralized SEO utilities for LenserFight Docs (VitePress).
 *
 * Design:
 * - All functions are pure / SSG-safe (no runtime-only APIs).
 * - A single import from config.ts replaces all inline SEO helpers.
 * - `buildPageHeadTags` is the single call-site for per-page head injection.
 * - `generateRobotsTxt` / `generateLlmsTxt` / `generateRssFeed` produce static
 *   file content written by the `buildEnd` hook.
 *
 * Validation checklist:
 * - Google Rich Results Test  → https://search.google.com/test/rich-results
 * - Lighthouse SEO audit      → chrome://extensions or PageSpeed Insights
 * - OpenGraph validator       → https://www.opengraph.xyz/
 * - Twitter Card validator    → https://cards-dev.twitter.com/validator
 * - Schema.org validator      → https://validator.schema.org/
 * - llms.txt spec             → https://llmstxt.org/
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ── Constants ──────────────────────────────────────────────────────────────────

export const DOCS_HOST = 'https://docs.lenserfight.com'
export const WEB_BASE_URL = process.env['WEB_BASE_URL'] || 'https://lenserfight.com'
export const OG_BANNER = `${DOCS_HOST}/og-banner.png`
export const SITE_TITLE = 'LenserFight Docs'
export const SITE_DESCRIPTION =
  'Technical documentation for LenserFight: AI lenses, Lensers, agents, workflows, battles, providers, CLI, and open-source contribution guides.'

/** Ordered list of supported locales — drives hreflang, OG alternates, llms.txt links. */
export const KNOWN_LOCALES = [
  'en',
  'tr',
  'es',
  'fr',
  'de',
  'zh',
  'ja',
  'ko',
  'ru',
  'pt',
  'it',
] as const
export type Locale = (typeof KNOWN_LOCALES)[number]

/** Maps BCP-47 locale codes to IETF OG locale identifiers (e.g. en → en_US). */
const LOCALE_TO_OG: Record<string, string> = {
  en: 'en_US',
  tr: 'tr_TR',
  es: 'es_ES',
  fr: 'fr_FR',
  de: 'de_DE',
  zh: 'zh_CN',
  ja: 'ja_JP',
  ko: 'ko_KR',
  ru: 'ru_RU',
  pt: 'pt_BR',
  it: 'it_IT',
}

// ── VitePress head tag type ────────────────────────────────────────────────────

/** Matches VitePress HeadConfig: [tag, attrs] or [tag, attrs, innerHTML] */
export type HeadTag = [string, Record<string, string>] | [string, Record<string, string>, string]

// ── Text utilities ─────────────────────────────────────────────────────────────

export function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function stripMarkdown(value: string): string {
  return compactText(
    value
      .replace(/^---[\s\S]*?---/, '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
      .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
      .replace(/[#>*_~|-]/g, ' ')
  )
}

export function truncateDescription(value: string, max = 158): string {
  const clean = compactText(value)
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).trimEnd()}…`
}

// ── Path utilities ─────────────────────────────────────────────────────────────

export function titleFromPath(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.md$/, '').replace(/(^|\/)index$/, '$1overview')
  const last = withoutExt.split('/').filter(Boolean).pop() ?? 'docs'
  return last.replace(/[-_]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
}

export function sectionFromPath(relativePath: string): string {
  if (relativePath.includes('/tutorials/')) return 'Tutorial'
  if (relativePath.includes('/how-to/')) return 'How-to Guide'
  if (relativePath.includes('/reference/')) return 'Reference'
  if (relativePath.includes('/explanation/')) return 'Explanation'
  if (relativePath.includes('/providers/')) return 'Provider Reference'
  if (relativePath.includes('/platform-setup/')) return 'Platform Setup'
  return 'Documentation'
}

export function localeFromPath(relativePath: string): string {
  return relativePath.split('/')[0] || 'en'
}

export function cleanDocsPath(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.md$/, '')
  if (withoutExt.endsWith('/index')) return `/${withoutExt.replace(/\/index$/, '/')}`
  return `/${withoutExt}`
}

export function canonicalForPage(relativePath: string): string {
  const path = cleanDocsPath(relativePath)
  return `${DOCS_HOST}${path === '/index' ? '/' : path}`
}

// ── Content utilities ──────────────────────────────────────────────────────────

export function readPageExcerpt(relativePath: string, docsDir: string): string {
  const file = resolve(docsDir, relativePath)
  if (!existsSync(file)) return ''
  return stripMarkdown(readFileSync(file, 'utf-8')).slice(0, 260)
}

export function buildPageDescription(
  relativePath: string,
  title: string,
  docsDir: string,
  frontmatterDescription?: string
): string {
  if (frontmatterDescription) return truncateDescription(frontmatterDescription)
  const excerpt = readPageExcerpt(relativePath, docsDir)
  if (excerpt) return truncateDescription(excerpt)
  const section = sectionFromPath(relativePath).toLowerCase()
  return truncateDescription(
    `${title} in the LenserFight ${section}: practical guidance for AI lenses, Lensers, agents, workflows, battles, providers, and developer automation.`
  )
}

function derivedKeywords(relativePath: string, frontmatterKeywords?: string): string {
  if (frontmatterKeywords) return frontmatterKeywords
  const base = [
    'LenserFight',
    'AI lenses',
    'AI agents',
    'AI battles',
    'LLM workflows',
    'agent orchestration',
    'prompt engineering',
    'AI automation',
  ]
  if (relativePath.includes('/tutorials/')) base.push('tutorial', 'getting started')
  if (relativePath.includes('/reference/')) base.push('API reference', 'CLI reference')
  if (relativePath.includes('/providers/')) base.push('AI provider', 'model provider', 'BYOK')
  if (relativePath.includes('/workflows/')) base.push('workflow automation', 'pipeline')
  if (relativePath.includes('/agents/')) base.push('autonomous agents', 'agent orchestration')
  return base.join(', ')
}

// ── JSON-LD shape helpers ──────────────────────────────────────────────────────

function organizationShape() {
  return {
    '@type': 'Organization',
    '@id': `${WEB_BASE_URL}/#organization`,
    name: 'LenserFight',
    url: WEB_BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: 'https://cdn.lenserfight.com/brand/lenserfight-logo.png',
    },
  }
}

function schemaTypeForPage(relativePath: string): string {
  if (relativePath.includes('/reference/')) return 'TechArticle'
  if (relativePath.includes('/tutorials/') || relativePath.includes('/how-to/')) return 'HowTo'
  return 'TechArticle'
}

// ── JSON-LD builders ───────────────────────────────────────────────────────────

/** Site-wide WebSite schema — injected once in global head. */
export function buildWebSiteJsonLd(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${DOCS_HOST}/#website`,
    name: SITE_TITLE,
    url: DOCS_HOST,
    description: SITE_DESCRIPTION,
    publisher: organizationShape(),
    inLanguage: [...KNOWN_LOCALES],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${DOCS_HOST}/en/?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  })
}

/** Standalone Organization schema — helps Google Knowledge Panel and AI indexers. */
export function buildOrganizationJsonLd(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    ...organizationShape(),
    description:
      'LenserFight is an open-source AI battle platform for building, evaluating, and competing with AI lenses, agents, and workflows.',
    sameAs: ['https://github.com/conectlens/lenserfight', 'https://twitter.com/lenserfight'],
  })
}

/** SoftwareApplication schema — surfaces in Google app results and AI summaries. */
export function buildSoftwareAppJsonLd(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'LenserFight',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web, Cross-platform',
    url: WEB_BASE_URL,
    description:
      'AI battle platform for building, evaluating, and competing with AI lenses, agents, and workflows.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: organizationShape(),
    softwareVersion: '1.0',
    license: 'https://github.com/conectlens/lenserfight/blob/main/LICENSE',
    codeRepository: 'https://github.com/conectlens/lenserfight',
    featureList: [
      'AI lens creation and management',
      'Multi-model battle evaluation',
      'Automated workflow pipelines',
      'Pluggable AI provider support (OpenAI, Anthropic, Gemini, Ollama)',
      'BYOK (Bring Your Own Key)',
      'CLI and REST API',
      'Open-source self-hosting',
    ],
  })
}

/** Per-page TechArticle or HowTo schema. */
export function buildDocsJsonLd(relativePath: string, title: string, description: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': schemaTypeForPage(relativePath),
    headline: title,
    name: title,
    description,
    url: canonicalForPage(relativePath),
    inLanguage: localeFromPath(relativePath),
    image: OG_BANNER,
    author: organizationShape(),
    publisher: organizationShape(),
    isPartOf: { '@type': 'WebSite', '@id': `${DOCS_HOST}/#website` },
    about: [
      'AI lenses',
      'LenserFight workflows',
      'AI agents',
      'AI battles',
      'developer AI tools',
      'open-source contribution',
    ],
  }
}

/** BreadcrumbList schema derived from the page path. */
export function buildBreadcrumbJsonLd(relativePath: string): string {
  const locale = localeFromPath(relativePath)
  const parts = relativePath.replace(/\.md$/, '').split('/').filter(Boolean).slice(1) // drop locale segment

  const items: Array<{ '@type': string; position: number; name: string; item?: string }> = [
    { '@type': 'ListItem', position: 1, name: SITE_TITLE, item: `${DOCS_HOST}/${locale}/` },
  ]

  let acc = `/${locale}`
  parts.forEach((part, i) => {
    acc += `/${part}`
    const isLast = i === parts.length - 1
    const name = part === 'index' ? 'Overview' : titleFromPath(`${part}.md`)
    const entry: (typeof items)[number] = {
      '@type': 'ListItem',
      position: i + 2,
      name,
    }
    if (!isLast) entry.item = `${DOCS_HOST}${acc}/`
    items.push(entry)
  })

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  })
}

/** FAQPage schema — opt-in via `faq:` array in page frontmatter. */
export function buildFaqJsonLd(faqs: Array<{ question: string; answer: string }>): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  })
}

// ── Per-page head tag builder ──────────────────────────────────────────────────

/**
 * Returns all head tags to inject for a single documentation page.
 *
 * Covers: canonical, robots, author, keywords, og:type (article), og:title,
 * og:description, og:url, og:locale + og:locale:alternate, article:author,
 * article:section, twitter:title, twitter:description, BreadcrumbList JSON-LD,
 * TechArticle/HowTo JSON-LD, optional FAQPage JSON-LD.
 *
 * VitePress deduplicates by (tag + unique attribute key), so per-page og:type
 * correctly overrides the global og:type=website fallback for article pages.
 */
export function buildPageHeadTags(
  relativePath: string,
  title: string,
  description: string,
  frontmatter: Record<string, unknown> = {}
): HeadTag[] {
  const canonical = canonicalForPage(relativePath)
  const locale = localeFromPath(relativePath)
  const ogLocale = LOCALE_TO_OG[locale] ?? 'en_US'
  const section = sectionFromPath(relativePath)
  const isIndexPage = relativePath.endsWith('/index.md') || relativePath === 'index.md'
  const keywords = derivedKeywords(relativePath, frontmatter['keywords'] as string | undefined)

  const tags: HeadTag[] = [
    // ── Indexing ──────────────────────────────────────────────────────────────
    ['link', { rel: 'canonical', href: canonical }],
    ['meta', { name: 'robots', content: 'index,follow,max-image-preview:large' }],
    ['meta', { name: 'author', content: 'LenserFight' }],
    ['meta', { name: 'keywords', content: keywords }],
    // ── Open Graph ────────────────────────────────────────────────────────────
    ['meta', { property: 'og:type', content: isIndexPage ? 'website' : 'article' }],
    ['meta', { property: 'og:title', content: `${title} | ${SITE_TITLE}` }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:url', content: canonical }],
    ['meta', { property: 'og:locale', content: ogLocale }],
    // ── Twitter / X ───────────────────────────────────────────────────────────
    ['meta', { name: 'twitter:title', content: `${title} | ${SITE_TITLE}` }],
    ['meta', { name: 'twitter:description', content: description }],
    // ── Structured data ───────────────────────────────────────────────────────
    ['script', { type: 'application/ld+json' }, buildBreadcrumbJsonLd(relativePath)],
    [
      'script',
      { type: 'application/ld+json' },
      JSON.stringify(buildDocsJsonLd(relativePath, title, description)),
    ],
  ]

  // Alternate locale OG tags for Googlebot multilingual signals
  for (const loc of KNOWN_LOCALES) {
    if (loc === locale) continue
    tags.push(['meta', { property: 'og:locale:alternate', content: LOCALE_TO_OG[loc] ?? loc }])
  }

  // Article Open Graph — article pages only
  if (!isIndexPage) {
    tags.push(['meta', { property: 'article:author', content: 'LenserFight' }])
    tags.push(['meta', { property: 'article:section', content: section }])
  }

  // Frontmatter FAQ support — adds FAQPage JSON-LD when `faq:` array present
  const faqs = frontmatter['faq'] as Array<{ question: string; answer: string }> | undefined
  if (Array.isArray(faqs) && faqs.length > 0) {
    tags.push(['script', { type: 'application/ld+json' }, buildFaqJsonLd(faqs)])
  }

  return tags
}

// ── Static file generators (used in buildEnd) ──────────────────────────────────

/**
 * Generates robots.txt content.
 * - Explicit allow rules for all major AI crawlers (GEO signal).
 * - Points to the VitePress-generated sitemap.xml.
 */
export function generateRobotsTxt(): string {
  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    '# AI crawlers — explicit allow for GEO (Generative Engine Optimization)',
    'User-agent: GPTBot',
    'Allow: /',
    '',
    'User-agent: ChatGPT-User',
    'Allow: /',
    '',
    'User-agent: PerplexityBot',
    'Allow: /',
    '',
    'User-agent: ClaudeBot',
    'Allow: /',
    '',
    'User-agent: anthropic-ai',
    'Allow: /',
    '',
    'User-agent: Gemini',
    'Allow: /',
    '',
    'User-agent: Googlebot',
    'Allow: /',
    '',
    'User-agent: Bingbot',
    'Allow: /',
    '',
    `Sitemap: ${DOCS_HOST}/sitemap.xml`,
  ]
  return lines.join('\n') + '\n'
}

/**
 * Generates llms.txt — the emerging standard for AI-readable site manifests.
 * Reference: https://llmstxt.org/
 *
 * Structure: title, short description, concept glossary, section links,
 * source/license, multilingual index, key topic signal for retrieval systems.
 */
export function generateLlmsTxt(): string {
  const localeLinks = (KNOWN_LOCALES as readonly string[])
    .map((loc) => `- [${loc.toUpperCase()} Documentation](${DOCS_HOST}/${loc}/)`)
    .join('\n')

  return `\
# ${SITE_TITLE}

> ${SITE_DESCRIPTION}

LenserFight is an open-source AI battle platform where developers build, train, and compete with AI lenses, agents, and automated workflows. It supports pluggable model providers (OpenAI, Anthropic, Google Gemini, Ollama, and more), a full CLI, a REST/PostgREST API, and structured battle evaluation with ELO ranking.

## Core Concepts

- **Lens** — A reusable AI prompt unit with defined behavior, persona, memory, and tools.
- **Lenser** — A profile entity that owns and operates one or more Lenses.
- **Battle** — A structured head-to-head evaluation between Lenses judged by criteria and/or an AI judge.
- **Workflow** — An automated multi-step pipeline connecting Lenses, tools, and external triggers.
- **Agent** — An autonomous Lens with memory, tools, and scheduling capabilities.
- **Team** — A group of Agents collaborating on shared tasks with defined roles and scratchpad.
- **BYOK** — Bring Your Own Key: connect personal API keys to any supported model provider.

## Documentation

- [Getting Started](${DOCS_HOST}/en/tutorials/getting-started/overview)
- [Tutorials](${DOCS_HOST}/en/tutorials/)
- [How-to Guides](${DOCS_HOST}/en/how-to/)
- [Reference](${DOCS_HOST}/en/reference/)
- [Explanation](${DOCS_HOST}/en/explanation/)
- [CLI Reference](${DOCS_HOST}/en/reference/cli/)
- [Platform API](${DOCS_HOST}/en/reference/platform-api/)
- [AI Providers](${DOCS_HOST}/en/reference/ai-providers)
- [Changelog](${DOCS_HOST}/en/changelog)

## Source Code

- Repository: https://github.com/conectlens/lenserfight
- License: Apache 2.0
- Primary language: TypeScript

## Multilingual Documentation

${localeLinks}

## Key Topics

AI agents, AI battle platform, AI lenses, AI workflows, LLM infrastructure, agent orchestration, prompt engineering, benchmark systems, automation pipelines, developer AI tools, self-hosted AI, open-source LLM platform, multi-model evaluation, BYOK, AI provider integration, agentic teams.

## Sitemap

${DOCS_HOST}/sitemap.xml
`
}

/**
 * Generates an Atom-compatible RSS feed for the changelog page.
 * Inject this into buildEnd as `feed.xml` in the outDir root.
 */
export function generateChangelogRss(lastmod: Date = new Date()): string {
  const isoDate = lastmod.toISOString()
  const changelogUrl = `${DOCS_HOST}/en/changelog`
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_TITLE} — Changelog</title>
    <link>${changelogUrl}</link>
    <description>Full release history for LenserFight — every version, every change.</description>
    <language>en</language>
    <lastBuildDate>${lastmod.toUTCString()}</lastBuildDate>
    <atom:link href="${DOCS_HOST}/feed.xml" rel="self" type="application/rss+xml" />
    <item>
      <title>LenserFight Changelog</title>
      <link>${changelogUrl}</link>
      <guid isPermaLink="true">${changelogUrl}</guid>
      <description>Full release history for LenserFight. See the changelog for all updates.</description>
      <pubDate>${isoDate}</pubDate>
    </item>
  </channel>
</rss>`
}
