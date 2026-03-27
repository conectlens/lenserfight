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
  className?: string
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
  className = '',
}) => {
  const { IdleAnimation } = renderer

  return (
    <div className={`w-full md:w-64 lg:w-72 md:flex-shrink-0 flex flex-col items-center justify-center border-b border-surface-border-subtle md:border-b-0 md:border-r bg-surface-base/50 md:bg-transparent px-4 py-8 md:py-0 relative z-10 ${className}`}>
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div key="idle" variants={phaseVariants} initial="initial" animate="animate" exit="exit" className="w-full">
            <IdleAnimation />
          </motion.div>
        )}
        {phase === 'running' && (
          <motion.div key="running" variants={phaseVariants} initial="initial" animate="animate" exit="exit" className="w-full text-center">
            <div className="text-surface-text-muted text-xs font-semibold uppercase tracking-widest mb-3">AI Scoring</div>
            <div className="flex justify-center gap-1.5">
              {[0,1,2].map(i => (
                <span key={i} className="inline-block h-2.5 w-2.5 rounded-full bg-primary-yellow-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </motion.div>
        )}
        {phase === 'voting' && (
          <motion.div key="voting" variants={phaseVariants} initial="initial" animate="animate" exit="exit" className="w-full max-w-sm mx-auto">
            {renderVotePanel}
          </motion.div>
        )}
        {phase === 'result' && (
          <motion.div key="result" variants={phaseVariants} initial="initial" animate="animate" exit="exit" className="w-full max-w-sm mx-auto">
            {renderResultBanner}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
