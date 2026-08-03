import React from 'react'

import { MediaShowcaseTour, type MediaShowcaseTourSlide } from './MediaShowcase'

// Self-hosted, real screenshots captured from a running local instance —
// versioned with the app, no external CDN dependency.
const SHOTS = '/screenshots'

const SLIDES: ReadonlyArray<MediaShowcaseTourSlide> = [
  {
    images: {
      light: `${SHOTS}/lens-detail-light.png`,
      dark: `${SHOTS}/lens-detail-dark.png`,
      fallbackLabel: 'Lens Detail Preview Unavailable',
    },
  },
  {
    images: {
      light: `${SHOTS}/workflow-detail-light.png`,
      dark: `${SHOTS}/workflow-detail-dark.png`,
      fallbackLabel: 'Workflow Preview Unavailable',
    },
  },
  {
    images: {
      light: `${SHOTS}/lens-create-light.png`,
      dark: `${SHOTS}/lens-create-dark.png`,
      fallbackLabel: 'Lens Create Preview Unavailable',
    },
  },
  {
    images: {
      light: `${SHOTS}/lenserboard-light.png`,
      dark: `${SHOTS}/lenserboard-dark.png`,
      fallbackLabel: 'Lenserboard Preview Unavailable',
    },
  },
  {
    images: {
      light: `${SHOTS}/agent-workspace-light.png`,
      dark: `${SHOTS}/agent-workspace-dark.png`,
      fallbackLabel: 'Agent Workspace Preview Unavailable',
    },
  },
  {
    images: {
      light: `${SHOTS}/battle-detail-light.png`,
      dark: `${SHOTS}/battle-detail-dark.png`,
      fallbackLabel: 'Battle Detail Preview Unavailable',
    },
  },
  {
    images: {
      light: `${SHOTS}/lenser-profile-light.png`,
      dark: `${SHOTS}/lenser-profile-dark.png`,
      fallbackLabel: 'Lenser Profile Preview Unavailable',
    },
  },
]

export const HomeTour: React.FC = () => (
  <MediaShowcaseTour slides={SLIDES} i18nNamespace="home" i18nPrefix="homeTour" />
)

export default HomeTour
