import React from 'react'
import { Helmet } from 'react-helmet-async'

const DEFAULT_OG_IMAGE = 'https://cdn.lenserfight.com/brand/og-default.png'

interface PageMetaProps {
  title: string
  description: string
  ogImage?: string
  ogType?: 'website' | 'article' | 'profile'
  canonicalUrl?: string
  robots?: 'index,follow' | 'noindex,nofollow'
  jsonLd?: Record<string, unknown>
}

export function PageMeta({
  title,
  description,
  ogImage,
  ogType = 'website',
  canonicalUrl,
  robots = 'index,follow',
  jsonLd,
}: PageMetaProps) {
  const image = ogImage ?? DEFAULT_OG_IMAGE
  const rawUrl =
    canonicalUrl ??
    (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://moon.lenserfight.com')
  const url = rawUrl.replace(/[?#].*$/, '').replace(/\/+$/, '') || rawUrl

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots === 'index,follow' ? 'index,follow,max-image-preview:large' : robots} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:site_name" content="LenserFight" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={title} />
      <meta name="twitter:site" content="@lenserfight" />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  )
}
