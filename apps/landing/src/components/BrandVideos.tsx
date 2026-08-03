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
  <div className="flex flex-col items-center justify-center space-y-16">
    <div className="px-4 flex w-full justify-center">
      <video src="https://cdn.lenserfight.com/product/videos/introduction.mp4" width="720" aria-label="LenserFight — AI Prompt Framework & Workflow Engine & AI Benchmarking & AI Forum & Agent Lab & Agent Playground & Community-Driven Evaluations & AI Agents " autoPlay muted loop playsInline className="rounded-3xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 max-w-full" />
    </div>
    <MediaShowcaseTour slides={SLIDES} i18nNamespace="demo" i18nPrefix="brandTour" />
  </div>
)

export default BrandVideos
