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
  center: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as [number,number,number,number] } },
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
    <div className="space-y-4">
      {/* Battle header */}
      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <Badge color="blue" variant="outline">{t('preview.battleLabel')}</Badge>
          <Badge color={PHASE_BADGE_COLORS[phase]} variant="outline">
            {t(`preview.phases.${phase}`)}
          </Badge>
        </div>
        <p className="text-base font-semibold text-greyscale-900 dark:text-greyscale-0">
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
          <div className="grid grid-cols-2 gap-3">
            {[
              { slot: 'A', label: t('preview.contenderHuman'), color: 'blue' as const, text: t('preview.contenderHumanText') },
              { slot: 'B', label: t('preview.contenderAi'), color: 'yellow' as const, text: t('preview.contenderAiText') },
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
                  {phase === 'idle' ? t('preview.awaitingOutput') : text}
                </p>
                {phase !== 'idle' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-greyscale-500">
                      <span>{t('preview.votes')}</span>
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
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-greyscale-500">{t('preview.winner')}</p>
                <p className="mt-0.5 text-sm font-bold text-greyscale-900 dark:text-greyscale-0">
                  {t('preview.humanWins', { pct: VOTE_A })}
                </p>
              </div>
              <Badge color="green">{t('preview.published')}</Badge>
            </Card>
          )}

          {phase === 'voting' && (
            <Card className="p-4 text-center">
              <p className="text-xs text-greyscale-500 mb-2">{t('preview.castYourVote')}</p>
              <div className="flex gap-2 justify-center">
                {[t('preview.voteHuman'), t('preview.voteDraw'), t('preview.voteAi')].map((v) => (
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
