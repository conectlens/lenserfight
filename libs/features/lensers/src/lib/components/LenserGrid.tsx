import React from 'react'
import type { LenserListItem } from '@lenserfight/types'
import { LenserCard } from './LenserCard'

interface LenserGridProps {
  items: LenserListItem[]
}

export const LenserGrid: React.FC<LenserGridProps> = ({ items }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {items.map((lenser) => (
      <LenserCard key={lenser.id} lenser={lenser} />
    ))}
  </div>
)
