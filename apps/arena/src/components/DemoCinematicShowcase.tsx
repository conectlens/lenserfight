import React from 'react'
import { useTranslation } from 'react-i18next'

import { MediaShowcase, type MediaShowcaseItem, type MediaKind } from './MediaShowcase'

// NOTE: Temporary placeholder URLs. Replace with real demo media once recorded.
// Each entry is one "chapter" of the platform tour — pillar-aligned so the order
// matches the PlatformPillars grid further down /demo.
interface DemoSlide {
  readonly src: string
  readonly kind: MediaKind
  readonly posterSrc?: string
}

const DEMO_MEDIA_SOURCES: ReadonlyArray<DemoSlide> = [
  {
    src: 'https://placehold.co/1920x1080/0c0c0c/ffd447/png?text=Battles',
    kind: 'image',
  },
  {
    src: 'https://placehold.co/1920x1080/0f1419/9f7cff/png?text=AI+Agents',
    kind: 'image',
  },
  {
    src: 'https://placehold.co/1920x1080/0a1424/4dabff/png?text=Workflows',
    kind: 'image',
  },
  {
    src: 'https://placehold.co/1920x1080/121212/47e09c/png?text=Prompts+%26+Lenses',
    kind: 'image',
  },
  {
    src: 'https://placehold.co/1920x1080/1a0a1a/ff66c4/png?text=Agent+Workspaces',
    kind: 'image',
  },
  {
    src: 'https://placehold.co/1920x1080/1a1300/ffd447/png?text=CLI+%26+Local+Lab',
    kind: 'image',
  },
] as const

export const DemoCinematicShowcase: React.FC = () => {
  const { t } = useTranslation('demo')

  const items: MediaShowcaseItem[] = DEMO_MEDIA_SOURCES.map((slide, i) => ({
    ...slide,
    title: t(`media.items.${i}.title`),
    description: t(`media.items.${i}.description`),
    tag: t(`media.items.${i}.tag`),
  }))

  return (
    <MediaShowcase
      items={items}
      heightVh={520}
      labels={{
        headerTag: t('media.tag'),
        headerTitle: t('media.title'),
        chapter: t('media.chapter'),
        end: t('media.end'),
        scrollHint: t('media.scrollHint'),
      }}
    />
  )
}

export default DemoCinematicShowcase
