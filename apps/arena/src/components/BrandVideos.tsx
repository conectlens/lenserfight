import React from 'react'

import { MediaShowcaseTour, type MediaShowcaseTourSlide } from './MediaShowcase'

const CDN_L = 'https://cdn.lenserfight.com/product/lenses'
const CDN_B = 'https://cdn.lenserfight.com/product/battles'
const CDN_P = 'https://cdn.lenserfight.com/product/pages'

const SLIDES: ReadonlyArray<MediaShowcaseTourSlide> = [
  {
    images: {
      light: `${CDN_B}/battle-detail-light-1.png`,
      dark: `${CDN_B}/battle-detail-dark-1.png`,
      fallbackLabel: 'Battle Detail Preview Unavailable',
    },
  },
  {
    images: {
      light: `${CDN_L}/lens-detail-light-1.png`,
      dark: `${CDN_L}/lens-detail-dark-1.png`,
      fallbackLabel: 'Lens Detail Preview Unavailable',
    },
  },
  {
    images: {
      light: `${CDN_L}/lens-create-light-1.png`,
      dark: `${CDN_L}/lens-create-dark-1.png`,
      fallbackLabel: 'Lens Create Preview Unavailable',
    },
  },
  {
    images: {
      light: `${CDN_L}/lens-list-light-1.png`,
      dark: `${CDN_L}/lens-list-dark-1.png`,
      fallbackLabel: 'Lens List Preview Unavailable',
    },
  },
  {
    images: {
      light: `${CDN_L}/lens-1-detail-executed-light-1.png`,
      dark: `${CDN_L}/lens-list-dark-1.png`,
      fallbackLabel: 'Lens Execution Preview Unavailable',
    },
  },
  {
    images: {
      light: `${CDN_B}/battle-add-light-1.png`,
      dark: `${CDN_B}/battle-detail-dark-1.png`,
      fallbackLabel: 'Battle Create Preview Unavailable',
    },
  },
  {
    images: {
      light: `${CDN_B}/battle-create-light-1.png`,
      dark: `${CDN_B}/battle-detail-dark-1.png`,
      fallbackLabel: 'Battle Setup Preview Unavailable',
    },
  },
  {
    images: {
      light: `${CDN_P}/lenserboard-light-1.png`,
      dark: `${CDN_P}/lenserboard-dark-1.png`,
      fallbackLabel: 'Lenserboard Preview Unavailable',
    },
  },
]

export const BrandVideos: React.FC = () => (
  <MediaShowcaseTour slides={SLIDES} i18nNamespace="demo" i18nPrefix="brandTour" />
)

export default BrandVideos
