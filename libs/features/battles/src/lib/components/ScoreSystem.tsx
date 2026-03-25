import React, { useEffect, useRef } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import { ScoreBar } from '@lenserfight/ui/widgets'
import type { VoteAggregate, Contender } from '../types/battle.types'

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
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          {contenderA?.display_name ?? 'A'}:{' '}
          <strong className="text-gray-900 ml-1">
            <AnimatedCount value={countA} />
          </strong>
        </span>
        <span className="flex items-center gap-1">
          {contenderB?.display_name ?? 'B'}:{' '}
          <strong className="text-gray-900 mr-1">
            <AnimatedCount value={countB} />
          </strong>
          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
        </span>
      </div>
      <ScoreBar
        scoreA={countA}
        scoreB={countB}
        labelA={contenderA?.display_name ?? 'A'}
        labelB={contenderB?.display_name ?? 'B'}
      />
    </div>
  )
}
