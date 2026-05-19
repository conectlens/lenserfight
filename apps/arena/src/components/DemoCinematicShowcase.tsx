import React from 'react'

import { MediaShowcaseTour, type MediaShowcaseTourSlide } from './MediaShowcase'

const CDN = 'https://cdn.lenserfight.com/product'

const SLIDES: ReadonlyArray<MediaShowcaseTourSlide> = [
  {
    images: {
      light: `${CDN}/battles/battle-detail-light-1.png`,
      dark: `${CDN}/battles/battle-detail-dark-1.png`,
      fallbackLabel: 'Battle Detail Preview Unavailable',
    },
  },
  {
    images: {
      light: `${CDN}/lenses/lens-1-detail-executed-light-1.png`,
      dark: `${CDN}/lenses/lens-list-dark-1.png`,
      fallbackLabel: 'Agent Execution Preview Unavailable',
    },
  },
  {
    images: {
      light: `${CDN}/lenses/lens-create-light-1.png`,
      dark: `${CDN}/lenses/lens-create-dark-1.png`,
      fallbackLabel: 'Workflow Detail Preview Unavailable',
    },
  },
  {
    images: {
      light: `${CDN}/lenses/lens-detail-light-1.png`,
      dark: `${CDN}/lenses/lens-detail-dark-1.png`,
      fallbackLabel: 'Lens Detail Preview Unavailable',
    },
  },
  {
    images: {
      light: `${CDN}/lenses/lens-list-light-1.png`,
      dark: `${CDN}/lenses/lens-list-dark-1.png`,
      fallbackLabel: 'Lens List Preview Unavailable',
    },
  },
  {
    images: {
      light: `${CDN}/pages/lenserboard-light-1.png`,
      dark: `${CDN}/pages/lenserboard-dark-1.png`,
      fallbackLabel: 'Lenserboard Preview Unavailable',
    },
  },
]

export const DemoCinematicShowcase: React.FC = () => (
  <MediaShowcaseTour slides={SLIDES} i18nNamespace="demo" i18nPrefix="media" heightVh={520} />
)

export default DemoCinematicShowcase
