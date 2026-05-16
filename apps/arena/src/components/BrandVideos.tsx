import React from 'react'
import { useTranslation } from 'react-i18next'

import { MediaShowcase, type MediaShowcaseItem } from './MediaShowcase'

const CDN = 'https://cdn.lenserfight.com/brand/gifs'

const BRAND_VIDEO_SOURCES = [
  `${CDN}/lf-animation-1.gif`,
  `${CDN}/lf-animation-2.gif`,
  `${CDN}/lf-animation-3.gif`,
  `${CDN}/lf-animation-4.gif`,
] as const

export const BrandVideos: React.FC = () => {
  const { t } = useTranslation('home')

  const items: MediaShowcaseItem[] = BRAND_VIDEO_SOURCES.map((src, i) => ({
    src,
    kind: 'gif',
    title: t(`brandVideos.items.${i}.title`),
    description: t(`brandVideos.items.${i}.description`),
    tag: t(`brandVideos.items.${i}.tag`),
  }))

  return (
    <MediaShowcase
      items={items}
      labels={{
        headerTag: t('brandVideos.tag'),
        headerTitle: t('brandVideos.title'),
        chapter: t('brandVideos.chapter'),
        end: t('brandVideos.end'),
        scrollHint: t('brandVideos.scrollHint'),
      }}
    />
  )
}

export default BrandVideos
