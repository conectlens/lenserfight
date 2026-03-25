import { motion } from 'framer-motion'
import React from 'react'

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
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-3 py-2 text-xs text-greyscale-500 dark:text-greyscale-400">
      {PHASES.map((item, idx) => {
        const isActive = item.phase === currentPhase
        const isDone = idx < currentIndex

        return (
          <React.Fragment key={item.phase}>
            <div className="relative flex items-center gap-2">
              <motion.div
                className={`h-2.5 w-2.5 rounded-full ${
                  isActive ? 'bg-status-blue' : isDone ? 'bg-greyscale-500' : 'bg-surface-interactive'
                }`}
                animate={isActive ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                transition={isActive ? { duration: 0.6, ease: 'easeOut' } : {}}
              />
              <span
                className={`text-[10px] ${
                  isActive
                    ? 'font-semibold text-greyscale-900 dark:text-greyscale-50'
                    : isDone
                    ? 'text-greyscale-500 dark:text-greyscale-400'
                    : 'text-greyscale-400 dark:text-greyscale-500'
                }`}
              >
                {item.label}
              </span>
            </div>
            {idx < PHASES.length - 1 && (
              <div
                className={`h-px w-4 rounded ${idx < currentIndex ? 'bg-greyscale-400' : 'bg-surface-border-subtle'}`}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
