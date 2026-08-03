import React from 'react'

import { MediaShowcaseTour, type MediaShowcaseTourSlide } from './MediaShowcase'

// Self-hosted, real screenshots captured from a running local instance —
// versioned with the app, no external CDN dependency. Items 4-5 (Agent
// Workspaces, CLI & Local Lab) don't have a real capture yet, so they stay
// on the CDN placeholder rather than being mislabeled.
const SHOTS = '/screenshots'
const CDN = 'https://cdn.lenserfight.com/product'

const SLIDES: ReadonlyArray<MediaShowcaseTourSlide> = [
  {
    images: {
      light: `${SHOTS}/battle-detail-light.png`,
      dark: `${SHOTS}/battle-detail-dark.png`,
      fallbackLabel: 'Battle Detail Preview Unavailable',
    },
  },
  {
    images: {
      // No dedicated agent-execution screenshot yet — agents run through the
      // same Lens execution engine, so the Lens workspace is the closest
      // real analogue.
      light: `${SHOTS}/lens-detail-light.png`,
      dark: `${SHOTS}/lens-detail-dark.png`,
      fallbackLabel: 'Agent Execution Preview Unavailable',
    },
  },
  {
    images: {
      light: `${SHOTS}/workflow-detail-light.png`,
      dark: `${SHOTS}/workflow-detail-dark.png`,
      fallbackLabel: 'Workflow Detail Preview Unavailable',
    },
  },
  {
    images: {
      light: `${SHOTS}/lens-create-light.png`,
      dark: `${SHOTS}/lens-create-dark.png`,
      fallbackLabel: 'Lens Detail Preview Unavailable',
    },
  },
  {
    images: {
      light: `${CDN}/lenses/lens-list-light-1.png`,
      dark: `${CDN}/lenses/lens-list-dark-1.png`,
      fallbackLabel: 'Agent Workspaces Preview Unavailable',
    },
  },
  {
    images: {
      light: `${CDN}/pages/lenserboard-light-1.png`,
      dark: `${CDN}/pages/lenserboard-dark-1.png`,
      fallbackLabel: 'CLI & Local Lab Preview Unavailable',
    },
  },
]

export const DemoCinematicShowcase: React.FC = () => (
  <MediaShowcaseTour slides={SLIDES} i18nNamespace="demo" i18nPrefix="media" heightVh={520} />
)

export default DemoCinematicShowcase
