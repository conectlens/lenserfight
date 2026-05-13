import { SEOHead } from '@lenserfight/ui/components'
import React from 'react'
import { Helmet } from 'react-helmet-async'

import type { Battle } from '../../types/battle.types'

interface BattleSEOHeadProps {
  battle?: Battle | null
}

export function BattleSEOHead({ battle }: BattleSEOHeadProps) {
  const shareCardUrl = battle?.og_image_url ?? null

  return (
    <>
      <SEOHead type="battle" data={battle} />
      {shareCardUrl ? (
        <Helmet>
          <meta property="og:image" content={shareCardUrl} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta name="twitter:image" content={shareCardUrl} />
        </Helmet>
      ) : null}
    </>
  )
}
