import { SEOHead } from '@lenserfight/ui/components'
import { VITE_API_BASE_URL } from '@lenserfight/utils/env'
import React from 'react'
import { Helmet } from 'react-helmet-async'

import type { Battle } from '../../types/battle.types'

interface BattleSEOHeadProps {
  battle?: Battle | null
}

/**
 * Build the platform-api share-card URL for a battle slug.
 * The platform-api renders a 1200x630 SVG OG image — see
 * `apps/platform-api/src/http/routes/battles-share-card.route.ts`.
 */
function buildShareCardUrl(slug: string): string {
  const base = VITE_API_BASE_URL.replace(/\/$/, '')
  return `${base}/v1/battles/${encodeURIComponent(slug)}/share-card.svg`
}

export function BattleSEOHead({ battle }: BattleSEOHeadProps) {
  const shareCardUrl = battle?.slug ? buildShareCardUrl(battle.slug) : null

  return (
    <>
      <SEOHead type="battle" data={battle} />
      {shareCardUrl ? (
        <Helmet>
          {/* Override og:image to use the per-battle share card from platform-api. */}
          <meta property="og:image" content={shareCardUrl} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta name="twitter:image" content={shareCardUrl} />
        </Helmet>
      ) : null}
    </>
  )
}
