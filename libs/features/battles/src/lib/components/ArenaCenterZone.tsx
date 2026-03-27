import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Battle, Contender, BattleUIPhase } from '../types/battle.types'
import type { BattleContentRenderer } from '../types/battle-renderer.types'

interface ArenaCenterZoneProps {
  phase: BattleUIPhase
  battle: Battle
  renderer: BattleContentRenderer
  contenderA?: Contender
  contenderB?: Contender
  onVote: (value: 'contender_a' | 'contender_b' | 'draw', rationale: string) => Promise<void>
  currentUserId?: string
  renderVotePanel: React.ReactNode
  renderResultBanner: React.ReactNode
}

const phaseVariants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.18 } },
}

export const ArenaCenterZone: React.FC<ArenaCenterZoneProps> = ({
  phase,
  renderer,
  renderVotePanel,
  renderResultBanner,
}) => {
  const { IdleAnimation } = renderer

  return (
    <div className="w-full md:w-56 md:flex-shrink-0 flex flex-col items-center justify-center border-b border-surface-border md:border-b-0 md:border-r bg-surface-raised px-4 py-4 md:py-0">
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div key="idle" variants={phaseVariants} initial="initial" animate="animate" exit="exit" className="w-full">
            <IdleAnimation />
          </motion.div>
        )}
        {phase === 'running' && (
          <motion.div key="running" variants={phaseVariants} initial="initial" animate="animate" exit="exit" className="w-full text-center">
            <div className="text-surface-text-muted text-xs mb-2">AI scoring in progress…</div>
            <div className="flex justify-center gap-1">
              {[0,1,2].map(i => (
                <span key={i} className="inline-block h-2 w-2 rounded-full bg-surface-border animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </motion.div>
        )}
        {phase === 'voting' && (
          <motion.div key="voting" variants={phaseVariants} initial="initial" animate="animate" exit="exit" className="w-full">
            {renderVotePanel}
          </motion.div>
        )}
        {phase === 'result' && (
          <motion.div key="result" variants={phaseVariants} initial="initial" animate="animate" exit="exit" className="w-full">
            {renderResultBanner}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
