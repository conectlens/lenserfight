import React, { useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { SEOMetadata, seoService } from '@lenserfight/data/repositories'

type SEOType =
  | 'home'
  | 'lens'
  | 'thread'
  | 'profile'
  | 'tag'
  | 'tag-cloud'
  | 'lenses-list'
  | 'battle'
  | 'battles-list'
  | 'default'

interface SEOHeadProps {
  type?: SEOType
  data?: any // Generic to accept Lenser, Prompt, Thread, etc.
  overrideTitle?: string
  title?: string
  description?: string
}

const FORUM_HOST = 'https://moon.lenserfight.com'
const DEFAULT_OG_IMAGE = `${FORUM_HOST}/og-banner.png`
const PRIVATE_ROUTE_PREFIXES = ['/admin', '/auth', '/account', '/settings', '/billing', '/notifications', '/onboarding']

export const SEOHead: React.FC<SEOHeadProps> = ({ type, data, overrideTitle, title, description }) => {
  const meta: SEOMetadata = useMemo(() => {
    if (title || description) {
      const home = seoService.getHomeMeta()
      return { title: title ?? home.title, description: description ?? home.description }
    }
    if (overrideTitle) {
      return { title: overrideTitle, description: seoService.getHomeMeta().description }
    }

    switch (type) {
      case 'home':
        return seoService.getHomeMeta()
      case 'lens':
        return seoService.getPromptMeta(data)
      case 'thread':
        return seoService.getThreadMeta(data)
      case 'profile':
        // Handles composite data { lenser, stats } if passed as object, or just lenser
        return seoService.getProfileMeta(data?.lenser || data, data?.stats)
      case 'tag':
        return seoService.getTagMeta(data)
      case 'tag-cloud':
        return seoService.getTagCloudMeta()
      case 'lenses-list':
        return seoService.getPromptsListMeta()
      case 'battle':
        return seoService.getBattleMeta(data)
      case 'battles-list':
        return seoService.getBattlesListMeta()
      default:
        return seoService.getHomeMeta()
    }
  }, [type, data, overrideTitle])

  // Derive canonical URL: prefer meta.url, fall back to current page location (client-only)
  const rawCanonicalUrl =
    meta.url ??
    (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : FORUM_HOST)
  const canonicalUrl = rawCanonicalUrl.replace(/[?#].*$/, '').replace(/\/+$/, '') || rawCanonicalUrl
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  const shouldIndex = meta.index ?? !PRIVATE_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))

  const ogImage = meta.ogImage ?? DEFAULT_OG_IMAGE
  const ogType =
    type === 'profile' ? 'profile' : type === 'lens' || type === 'thread' || type === 'battle' ? 'article' : 'website'

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta name="robots" content={shouldIndex ? 'index,follow,max-image-preview:large' : 'noindex,nofollow'} />

      {/* Canonical — critical for deduplication across search engines */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Social */}
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={meta.title} />
      <meta property="og:site_name" content="LenserFight" />

      {/* Twitter / X */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={meta.title} />
      <meta name="twitter:site" content="@lenserfight" />

      {/* JSON-LD structured data — helps Google, Bing, Yandex understand content type */}
      {meta.jsonLd && (
        <script type="application/ld+json">{JSON.stringify(meta.jsonLd)}</script>
      )}
    </Helmet>
  )
}
