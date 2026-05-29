import { Button } from '@lenserfight/ui/components'
import { ArrowRight } from 'lucide-react'
import React from 'react'

interface SeriesAdvanceButtonProps {
  canAdvance: boolean
  isPending: boolean
  onAdvance: () => void
}

export function SeriesAdvanceButton({ canAdvance, isPending, onAdvance }: SeriesAdvanceButtonProps) {
  if (!canAdvance) return null
  return (
    <Button size="sm" onClick={onAdvance} disabled={isPending}>
      {isPending ? 'Advancing…' : 'Advance series'}
      <ArrowRight size={14} className="ml-1" />
    </Button>
  )
}
