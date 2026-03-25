import React from 'react'
import { motion } from 'framer-motion'
import type { BattleUIPhase } from '../types/battle.types'

const PHASES: { phase: BattleUIPhase; label: string }[] = [
  { phase: 'idle', label: 'Open' },
  { phase: 'running', label: 'Scoring' },
  { phase: 'voting', label: 'Voting' },
  { phase: 'result', label: 'Result' },
]

interface PhaseIndicatorProps {
  currentPhase: BattleUIPhase
}

export function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  const currentIndex = PHASES.findIndex((p) => p.phase === currentPhase)

  return (
    <div className="flex items-center gap-1 text-xs text-gray-400">
      {PHASES.map((item, idx) => {
        const isActive = item.phase === currentPhase
        const isDone = idx < currentIndex

        return (
          <React.Fragment key={item.phase}>
            <div className="relative flex flex-col items-center gap-0.5">
              <motion.div
                className={`w-2 h-2 rounded-full ${
                  isActive
                    ? 'bg-gray-900'
                    : isDone
                    ? 'bg-gray-400'
                    : 'bg-gray-200'
                }`}
                animate={isActive ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                transition={isActive ? { duration: 0.6, ease: 'easeOut' } : {}}
              />
              <span
                className={`text-[10px] ${
                  isActive ? 'text-gray-900 font-semibold' : isDone ? 'text-gray-400' : 'text-gray-300'
                }`}
              >
                {item.label}
              </span>
            </div>
            {idx < PHASES.length - 1 && (
              <div
                className={`h-px w-6 mb-3 rounded ${idx < currentIndex ? 'bg-gray-400' : 'bg-gray-200'}`}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
