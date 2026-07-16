// Serializes a SeoDocument into a complete bot HTML document. Reimplements the
// canonical/robots/OG/Twitter/hreflang derivation that lives inline in the React
// SEOHead — but purely, from an explicit canonical URL (no window globals) — so
// the Worker and the SPA emit the same tag set.

import { escapeAttr, escapeHtml, serializeJsonLd } from './html'
import type { SEOMetadata } from './meta/seoService'

const SITE_NAME = 'LenserFight'
const TWITTER_HANDLE = '@lenserfight'
const OG_IMAGE_DEFAULT = 'https://moon.lenserfight.com/og-banner.png'

export interface SeoDocument {
  meta: SEOMetadata
  /** Absolute canonical URL. */
  canonical: string
  hreflang: Array<{ lang: string; href: string }>
  /** Crawlable body HTML (already escaped by the body renderers). */
  bodyHtml: string
  locale?: string
  /** og:type — profile | article | website. */
  ogType?: string
}

function metaTag(property: 'property' | 'name', key: string, content: string): string {
  return `<meta ${property}="${key}" content="${escapeAttr(content)}" />`
}

/** Renders a full `<!doctype html>` document for a crawler. */
export function renderBotHtml(doc: SeoDocument): string {
  const m = doc.meta
  const canonical = doc.canonical
  const robots = m.index === false ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'
  const ogType = doc.ogType ?? 'website'
  const ogImage = m.ogImage ?? OG_IMAGE_DEFAULT
  const locale = doc.locale ?? 'en'
  const ogLocale = locale === 'tr' ? 'tr_TR' : 'en_US'

  const head: string[] = [
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escapeHtml(m.title)}</title>`,
    metaTag('name', 'description', m.description),
    metaTag('name', 'robots', robots),
    `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
    ...doc.hreflang.map(
      (a) => `<link rel="alternate" hreflang="${escapeAttr(a.lang)}" href="${escapeAttr(a.href)}" />`,
    ),
    metaTag('property', 'og:type', ogType),
    metaTag('property', 'og:site_name', SITE_NAME),
    metaTag('property', 'og:title', m.title),
    metaTag('property', 'og:description', m.description),
    metaTag('property', 'og:url', canonical),
    metaTag('property', 'og:image', ogImage),
    metaTag('property', 'og:image:width', '1200'),
    metaTag('property', 'og:image:height', '630'),
    metaTag('property', 'og:locale', ogLocale),
    metaTag('name', 'twitter:card', 'summary_large_image'),
    metaTag('name', 'twitter:site', TWITTER_HANDLE),
    metaTag('name', 'twitter:title', m.title),
    metaTag('name', 'twitter:description', m.description),
    metaTag('name', 'twitter:image', ogImage),
  ]
  if (m.jsonLd) {
    head.push(`<script type="application/ld+json">${serializeJsonLd(m.jsonLd)}</script>`)
  }

  return `<!doctype html>
<html lang="${escapeAttr(locale)}">
  <head>
    ${head.join('\n    ')}
  </head>
  <body>
${doc.bodyHtml}
    <p><a href="${escapeAttr(canonical)}">Open in ${SITE_NAME}</a></p>
  </body>
</html>
`
}

/** Builds en / tr / x-default hreflang alternates from a canonical URL. */
export function buildHreflang(canonical: string): Array<{ lang: string; href: string }> {
  const trHref = `${canonical}${canonical.includes('?') ? '&' : '?'}lang=tr`
  return [
    { lang: 'en', href: canonical },
    { lang: 'tr', href: trHref },
    { lang: 'x-default', href: canonical },
  ]
}
