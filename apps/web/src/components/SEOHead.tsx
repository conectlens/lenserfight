import React, { useMemo } from 'react'
import { Helmet } from 'react-helmet-async'

import { seoService, SEOMetadata } from '../services/seoService'

type SEOType =
  | 'home'
  | 'prompt'
  | 'thread'
  | 'profile'
  | 'tag'
  | 'tag-cloud'
  | 'prompts-list'
  | 'default'

interface SEOHeadProps {
  type: SEOType
  data?: any // Generic to accept Lenser, Prompt, Thread, etc.
  overrideTitle?: string
}

export const SEOHead: React.FC<SEOHeadProps> = ({ type, data, overrideTitle }) => {
  const meta: SEOMetadata = useMemo(() => {
    if (overrideTitle) {
      return { title: overrideTitle, description: seoService.getHomeMeta().description }
    }

    switch (type) {
      case 'home':
        return seoService.getHomeMeta()
      case 'prompt':
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
      case 'prompts-list':
        return seoService.getPromptsListMeta()
      default:
        return seoService.getHomeMeta()
    }
  }, [type, data, overrideTitle])

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />

      {/* Open Graph / Social */}
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:type" content={type === 'profile' ? 'profile' : 'website'} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
    </Helmet>
  )
}
