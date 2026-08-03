import { Badge, Card } from '@lenserfight/ui/components'
import { AnimatePresence, motion } from 'framer-motion'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type DemoPhase = 'idle' | 'voting' | 'result'

const PHASES: DemoPhase[] = ['idle', 'voting', 'result']
const PHASE_DURATION = 4000

const PHASE_BADGE_COLORS: Record<DemoPhase, 'gray' | 'blue' | 'green'> = {
  idle: 'gray',
  voting: 'blue',
  result: 'green',
}

const VOTE_A = 63
const VOTE_B = 37

const phaseVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as [number, number, number, number] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
}

export function HeroFightPreview() {
  const { t } = useTranslation('home')
  const [phaseIdx, setPhaseIdx] = useState(0)
  const phase = PHASES[phaseIdx]

  useEffect(() => {
    const id = setInterval(() => {
      setPhaseIdx((i) => (i + 1) % PHASES.length)
    }, PHASE_DURATION)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="space-y-3">
      {/* Battle header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2.5">
          <Badge color="blue" variant="outline">{t('preview.battleLabel')}</Badge>
          <Badge color={PHASE_BADGE_COLORS[phase]} variant="outline">
            {t(`preview.phases.${phase}`)}
          </Badge>
        </div>
        <p className="text-sm font-semibold leading-5 text-greyscale-800 dark:text-greyscale-100">
          {t('preview.lensPrompt')}
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
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { slot: 'A', label: t('preview.contenderHuman'), color: 'blue' as const, text: t('preview.contenderHumanText'), votes: VOTE_A, bar: 'bg-[#287BFF]' },
              { slot: 'B', label: t('preview.contenderAi'), color: 'yellow' as const, text: t('preview.contenderAiText'), votes: VOTE_B, bar: 'bg-primary-yellow-500' },
            ].map(({ slot, label, color, text, votes, bar }) => (
              <Card key={slot} className="p-3 space-y-2.5 flex flex-col">
                <div className="flex items-center gap-1.5">
                  <Badge color={color} variant="outline">{slot}</Badge>
                  <span className="text-[11px] text-greyscale-500 truncate">{label}</span>
                </div>
                <p className={`text-[11px] leading-[1.6] flex-1 ${
                  phase === 'idle'
                    ? 'text-greyscale-400 italic'
                    : 'text-greyscale-700 dark:text-greyscale-300'
                }`}>
                  {phase === 'idle' ? t('preview.awaitingOutput') : text}
                </p>
                {phase !== 'idle' && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-greyscale-400">{t('preview.votes')}</span>
                      <span className="text-xs font-bold text-greyscale-900 dark:text-greyscale-0">
                        {votes}%
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-surface-raised">
                      <motion.div
                        className={`h-full rounded-full ${bar}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${votes}%` }}
                        transition={{ duration: 0.9, ease: [0, 0, 0.2, 1] }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Result banner */}
          {phase === 'result' && (
            <Card className="flex items-center justify-between gap-3 px-4 py-3 bg-status-green/5 ring-1 ring-status-green/20">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-greyscale-500 mb-0.5">
                  {t('preview.winner')}
                </p>
                <p className="text-sm font-bold text-greyscale-900 dark:text-greyscale-0">
                  {t('preview.humanWins', { pct: VOTE_A })}
                </p>
              </div>
              <Badge color="green">{t('preview.published')}</Badge>
            </Card>
          )}

          {/* Voting row */}
          {phase === 'voting' && (
            <Card className="px-4 py-3">
              <p className="text-[11px] text-greyscale-500 text-center mb-2">{t('preview.castYourVote')}</p>
              <div className="flex gap-2 justify-center">
                {[
                  { key: 'human', label: t('preview.voteHuman'), active: true, color: 'bg-[#287BFF]/10 text-[#287BFF] border-[#287BFF]/30' },
                  { key: 'draw', label: t('preview.voteDraw'), active: false, color: 'bg-surface-raised text-greyscale-500 border-surface-border' },
                  { key: 'ai', label: t('preview.voteAi'), active: false, color: 'bg-primary-yellow-500/10 text-primary-yellow-600 border-primary-yellow-500/30' },
                ].map(({ key, label, color }) => (
                  <div
                    key={key}
                    className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium cursor-default select-none ${color}`}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Phase progress dots */}
      <div className="flex justify-center gap-1.5 pt-0.5">
        {PHASES.map((p, i) => (
          <div
            key={p}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === phaseIdx
                ? 'w-5 bg-greyscale-800 dark:bg-greyscale-200'
                : 'w-1.5 bg-surface-raised'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
