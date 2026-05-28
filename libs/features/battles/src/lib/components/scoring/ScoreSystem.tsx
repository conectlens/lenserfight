import { Badge, Card } from '@lenserfight/ui/components'
import { ScoreBar } from '@lenserfight/ui/widgets'
import { useMotionValue, animate } from 'framer-motion'
import React, { useEffect, useRef } from 'react'

import type { VoteAggregate, Contender } from '../../types/battle.types'

interface ScoreSystemProps {
  aggregates: VoteAggregate[]
  contenders: Contender[]
}

function AnimatedCount({ value }: { value: number }) {
  const motionVal = useMotionValue(0)
  const displayRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (displayRef.current) {
          displayRef.current.textContent = String(Math.round(v))
        }
      },
    })
    return controls.stop
  }, [value, motionVal])

  return <span ref={displayRef}>0</span>
}

export function ScoreSystem({ aggregates, contenders }: ScoreSystemProps) {
  const contenderA = contenders.find((c) => c.slot === 'A')
  const contenderB = contenders.find((c) => c.slot === 'B')
  const aggA = contenderA ? aggregates.find((v) => v.contender_id === contenderA.id) : undefined
  const aggB = contenderB ? aggregates.find((v) => v.contender_id === contenderB.id) : undefined

  const countA = aggA?.raw_vote_count ?? 0
  const countB = aggB?.raw_vote_count ?? 0

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">Community signal</p>
        <Badge color="gray" variant="outline">
          Vote totals
        </Badge>
      </div>
      <div className="flex items-center justify-between text-xs font-medium text-greyscale-500 dark:text-greyscale-400">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary-yellow-500" />
          {contenderA?.display_name ?? 'A'}:
          <strong className="text-greyscale-900 dark:text-greyscale-50">
            <AnimatedCount value={countA} />
          </strong>
        </span>
        <span className="flex items-center gap-2">
          {contenderB?.display_name ?? 'B'}:
          <strong className="text-greyscale-900 dark:text-greyscale-50">
            <AnimatedCount value={countB} />
          </strong>
          <span className="h-2 w-2 rounded-full bg-primary-yellow-600" />
        </span>
      </div>
      <ScoreBar
        scoreA={countA}
        scoreB={countB}
        labelA={contenderA?.display_name ?? 'A'}
        labelB={contenderB?.display_name ?? 'B'}
      />
    </Card>
  )
}
