import { SEOHead } from '@lenserfight/ui/components'
import React from 'react'

import type { Battle } from '../types/battle.types'

interface BattleSEOHeadProps {
  battle?: Battle | null
}

export function BattleSEOHead({ battle }: BattleSEOHeadProps) {
  return <SEOHead type="battle" data={battle} />
}
