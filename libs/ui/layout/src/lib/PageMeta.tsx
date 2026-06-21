import React from 'react'
import { Helmet } from 'react-helmet-async'

const DEFAULT_OG_IMAGE = 'https://cdn.lenserfight.com/brand/og-default.png'
const BASE_URL = 'https://moon.lenserfight.com'

export interface BreadcrumbItem {
  name: string
  url: string
}

interface PageMetaProps {
  title: string
  description: string
  ogImage?: string
  ogType?: 'website' | 'article' | 'profile'
  canonicalUrl?: string
  robots?: 'index,follow' | 'noindex,nofollow'
  /** BCP-47 locale code, e.g. 'en', 'tr'. Emits og:locale and updates html[lang]. */
  locale?: string
  /** Ordered breadcrumb trail — emits BreadcrumbList JSON-LD as a second script. */
  breadcrumb?: BreadcrumbItem[]
  /** Emits <meta name="author"> — use on thread/article pages. */
  author?: string
  /** Primary JSON-LD schema. Pass a plain object; will be serialized safely. */
  jsonLd?: Record<string, unknown>
}

const OG_LOCALE_MAP: Record<string, string> = {
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

function toOgLocale(locale: string): string {
  return OG_LOCALE_MAP[locale] ?? locale.replace('-', '_')
}

function buildBreadcrumbSchema(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/** Serialize JSON-LD safely — escapes </script> injection via unicode escape. */
function serializeJsonLd(schema: Record<string, unknown>): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c')
}

export function PageMeta({
  title,
  description,
  ogImage,
  ogType = 'website',
  canonicalUrl,
  robots = 'index,follow',
  locale,
  breadcrumb,
  author,
  jsonLd,
}: PageMetaProps) {
  const image = ogImage ?? DEFAULT_OG_IMAGE
  const rawUrl =
    canonicalUrl ??
    (typeof window !== 'undefined'
      ? window.location.origin + window.location.pathname
      : BASE_URL)
  const url = rawUrl.replace(/[?#].*$/, '').replace(/\/+$/, '') || rawUrl
  const robotsContent =
    robots === 'index,follow' ? 'index,follow,max-image-preview:large' : robots
  const ogLocale = locale ? toOgLocale(locale) : undefined

  return (
    <Helmet>
      {/* Core */}
      <html lang={locale ?? 'en'} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robotsContent} />
      <link rel="canonical" href={url} />
      {author && <meta name="author" content={author} />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:site_name" content="LenserFight" />
      {ogLocale && <meta property="og:locale" content={ogLocale} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={title} />
      <meta name="twitter:site" content="@lenserfight" />

      {/* Primary JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">{serializeJsonLd(jsonLd)}</script>
      )}

      {/* BreadcrumbList JSON-LD — second script, separate from primary schema */}
      {breadcrumb && breadcrumb.length > 1 && (
        <script type="application/ld+json">
          {serializeJsonLd(buildBreadcrumbSchema(breadcrumb))}
        </script>
      )}
    </Helmet>
  )
}
