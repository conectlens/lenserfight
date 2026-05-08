import { Badge, Card } from '@lenserfight/ui/components'
import { AnimatePresence, motion } from 'framer-motion'
import React, { useEffect, useState } from 'react'

type DemoPhase = 'idle' | 'voting' | 'result'

const PHASES: DemoPhase[] = ['idle', 'voting', 'result']
const PHASE_DURATION = 4000

const PHASE_LABELS: Record<DemoPhase, string> = {
  idle: 'Awaiting submissions',
  voting: 'Voting open',
  result: 'Result published',
}

const PHASE_BADGE_COLORS: Record<DemoPhase, 'gray' | 'blue' | 'green'> = {
  idle: 'gray',
  voting: 'blue',
  result: 'green',
}

const VOTE_A = 63
const VOTE_B = 37

const phaseVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as [number,number,number,number] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
}

export function HeroFightPreview() {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const phase = PHASES[phaseIdx]

  useEffect(() => {
    const id = setInterval(() => {
      setPhaseIdx((i) => (i + 1) % PHASES.length)
    }, PHASE_DURATION)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="space-y-4">
      {/* Battle header */}
      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <Badge color="blue" variant="outline">Human vs AI · Demo</Badge>
          <Badge color={PHASE_BADGE_COLORS[phase]} variant="outline">
            {PHASE_LABELS[phase]}
          </Badge>
        </div>
        <p className="text-base font-semibold text-greyscale-900 dark:text-greyscale-0">
          Rewrite a technical error message for a non-technical user.
        </p>
      </Card>

      {/* Animated phase content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          variants={phaseVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="space-y-3"
        >
          {/* Contender outputs */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { slot: 'A', label: 'Human lenser', color: 'blue' as const, text: 'Your file could not upload because it was too large. Try compressing it or splitting it into smaller parts.' },
              { slot: 'B', label: 'Claude (AI)', color: 'yellow' as const, text: 'Upload failed: file exceeds the 10 MB limit. Please reduce the file size and try again.' },
            ].map(({ slot, label, color, text }) => (
              <Card key={slot} className="space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <Badge color={color} variant="outline">{slot}</Badge>
                  <span className="text-xs text-greyscale-500">{label}</span>
                </div>
                <p className={`text-xs leading-5 ${
                  phase === 'idle'
                    ? 'text-greyscale-400 italic'
                    : 'text-greyscale-700 dark:text-greyscale-300'
                }`}>
                  {phase === 'idle' ? 'Awaiting output…' : text}
                </p>
                {phase !== 'idle' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-greyscale-500">
                      <span>Votes</span>
                      <span className="font-semibold text-greyscale-900 dark:text-greyscale-0">
                        {slot === 'A' ? VOTE_A : VOTE_B}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                      <motion.div
                        className={`h-full rounded-full ${color === 'blue' ? 'bg-primary-yellow-500' : 'bg-primary-yellow-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${slot === 'A' ? VOTE_A : VOTE_B}%` }}
                        transition={{ duration: 0.8, ease: [0, 0, 0.2, 1] }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Result line */}
          {phase === 'result' && (
            <Card className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-greyscale-500">Winner</p>
                <p className="mt-0.5 text-sm font-bold text-greyscale-900 dark:text-greyscale-0">
                  Human lenser — {VOTE_A}% of votes
                </p>
              </div>
              <Badge color="green">Published</Badge>
            </Card>
          )}

          {phase === 'voting' && (
            <Card className="p-4 text-center">
              <p className="text-xs text-greyscale-500 mb-2">Cast your vote</p>
              <div className="flex gap-2 justify-center">
                {['Human A', 'Draw', 'AI B'].map((v) => (
                  <div key={v} className="rounded-xl border border-surface-border px-3 py-2 text-xs text-greyscale-600 dark:text-greyscale-400">
                    {v}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Phase dots */}
      <div className="flex justify-center gap-2 pt-1">
        {PHASES.map((p, i) => (
          <div
            key={p}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === phaseIdx ? 'w-5 bg-greyscale-900 dark:bg-greyscale-0' : 'w-1.5 bg-surface-raised'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
