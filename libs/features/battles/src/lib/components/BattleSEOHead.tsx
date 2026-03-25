import React from 'react'
import { SEOHead } from '@lenserfight/ui/components'
import type { Battle } from '../types/battle.types'

interface BattleSEOHeadProps {
  battle?: Battle | null
}

export function BattleSEOHead({ battle }: BattleSEOHeadProps) {
  return <SEOHead type="battle" data={battle} />
}
