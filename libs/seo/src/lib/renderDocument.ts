import { escapeAttr, escapeHtml, serializeJsonLd } from './html'
import type { SeoDocument } from './types'

const SITE_NAME = 'LenserFight'

/** Map a BCP-47 language to an OpenGraph locale token. */
const OG_LOCALE: Record<string, string> = {
  en: 'en_US',
  tr: 'tr_TR',
}

function ogLocale(locale: string): string {
  return OG_LOCALE[locale] ?? locale.replace('-', '_')
}

/**
 * Serialize a {@link SeoDocument} into a complete, standalone HTML document for
 * crawlers and social unfurlers. Pure string builder — no template engine, no
 * DOM. Every interpolated value is escaped.
 *
 * The document is intentionally minimal: correct head signals plus a crawlable
 * body with a canonical link back into the SPA. Humans never receive this — the
 * Worker only serves it to matched bot User-Agents.
 */
export function renderBotHtml(doc: SeoDocument): string {
  const { meta, canonical, locale, hreflang, bodyHtml } = doc

  const title = escapeHtml(meta.title)
  const description = escapeAttr(meta.description)
  const ogImage = meta.ogImage ? escapeAttr(meta.ogImage) : ''
  const robots = meta.index === false ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'

  const hreflangTags = hreflang
    .map(
      (alt) =>
        `<link rel="alternate" hreflang="${escapeAttr(alt.lang)}" href="${escapeAttr(alt.href)}" />`,
    )
    .join('')

  const jsonLdTag = meta.jsonLd
    ? `<script type="application/ld+json">${serializeJsonLd(meta.jsonLd)}</script>`
    : ''

  const ogImageTags = ogImage
    ? `<meta property="og:image" content="${ogImage}" /><meta name="twitter:image" content="${ogImage}" />`
    : ''

  return `<!doctype html>
<html lang="${escapeAttr(locale)}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${escapeAttr(canonical)}" />
<meta name="robots" content="${robots}" />
${hreflangTags}
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${SITE_NAME}" />
<meta property="og:locale" content="${escapeAttr(ogLocale(locale))}" />
<meta property="og:title" content="${escapeAttr(meta.title)}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${escapeAttr(canonical)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeAttr(meta.title)}" />
<meta name="twitter:description" content="${description}" />
${ogImageTags}
${jsonLdTag}
</head>
<body>
${bodyHtml}
<hr />
<a href="${escapeAttr(canonical)}">Open in LenserFight</a>
</body>
</html>`
}
