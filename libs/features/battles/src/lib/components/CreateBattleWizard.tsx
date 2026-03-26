import { Badge, Button, Card } from '@lenserfight/ui/components'
import { battlesService } from '@lenserfight/data/repositories'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Swords } from 'lucide-react'
import React, { useState } from 'react'

import { BattleTypeSelector } from './BattleTypeSelector'
import { ContenderInviteStep } from './ContenderInviteStep'
import { HandicapConfigPanel } from './HandicapConfigPanel'
import { VoterEligibilitySelector } from './VoterEligibilitySelector'

import type { AIHandicapConfig, BattleType, VoterEligibility } from '../types/battle.types'

const STEPS = ['Basics', 'Battle type', 'Configuration', 'Contenders'] as const
type Step = 0 | 1 | 2 | 3

const DEFAULT_HANDICAP: AIHandicapConfig = {
  injected_delay_ms: 2000,
  time_budget_ms: 300000,
  max_context_tokens: null,
  max_tokens_per_second: null,
  allowed_model_tier: null,
}

const AI_BATTLE_TYPES: BattleType[] = ['ai_vs_ai', 'human_vs_ai', 'human_vs_human_ai_votes']

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 32 : -32 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.25, ease: [0, 0, 0.2, 1] as [number, number, number, number] } },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -32 : 32, transition: { duration: 0.18 } }),
}

export interface CreateBattleWizardProps {
  /** Called with the new battle slug on successful creation. */
  onSuccess: (slug: string) => void
  /** Called when the user cancels or closes the wizard. */
  onClose: () => void
}

/**
 * Self-contained battle creation wizard.
 *
 * Can be rendered:
 * - Inside a `ModalRoute` (Dialog wrapper provided externally)
 * - Directly as a full-page component via `CreateBattlePage`
 */
export const CreateBattleWizard: React.FC<CreateBattleWizardProps> = ({ onSuccess, onClose }) => {
  const [step, setStep] = useState<Step>(0)
  const [direction, setDirection] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [taskPrompt, setTaskPrompt] = useState('')
  const [battleType, setBattleType] = useState<BattleType>('human_vs_human_open_votes')
  const [voterEligibility, setVoterEligibility] = useState<VoterEligibility>('open')
  const [handicap, setHandicap] = useState<AIHandicapConfig>(DEFAULT_HANDICAP)

  // Created battle state — populated after step 2 completes
  const [createdBattleId, setCreatedBattleId] = useState<string | null>(null)
  const [createdBattleSlug, setCreatedBattleSlug] = useState<string | null>(null)

  const showsHandicap = AI_BATTLE_TYPES.includes(battleType)

  const go = (next: Step) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  const handleBattleTypeChange = (type: BattleType) => {
    setBattleType(type)
    if (type === 'human_vs_human_ai_votes') {
      setVoterEligibility('ai_only')
    } else if (voterEligibility === 'ai_only') {
      setVoterEligibility('open')
    }
  }

  const canAdvanceStep0 = title.trim().length >= 3 && taskPrompt.trim().length >= 20

  const handleCreateBattle = async () => {
    if (!canAdvanceStep0) return
    setSubmitting(true)
    setError(null)
    try {
      const battle = await battlesService.createBattle({
        title: title.trim(),
        task_prompt: taskPrompt.trim(),
        battle_type: battleType,
        voter_eligibility: voterEligibility,
        handicap: showsHandicap ? handicap : undefined,
      })
      setCreatedBattleId(battle.id)
      setCreatedBattleSlug(battle.slug)
      go(3)
    } catch (e) {
      setError((e as Error).message ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-3">
        {STEPS.map((label, i) => {
          const done = i < step
          const active = i === step
          return (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${done
                    ? 'bg-greyscale-900 text-greyscale-0 dark:bg-greyscale-0 dark:text-greyscale-900'
                    : active
                      ? 'border-2 border-greyscale-900 text-greyscale-900 dark:border-greyscale-0 dark:text-greyscale-0'
                      : 'border border-surface-border text-greyscale-400'
                  }`}>
                  {done ? <Check size={13} /> : i + 1}
                </div>
                <span className={`hidden sm:block text-sm font-semibold ${active ? 'text-greyscale-900 dark:text-greyscale-0' : 'text-greyscale-400'
                  }`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="h-px flex-1 bg-surface-border" />
              )}
            </React.Fragment>
          )
        })}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {/* Step 0: Battle basics */}
          {step === 0 && (
            <Card className="space-y-5 p-6">
              <div className="space-y-2">
                <Badge color="blue" variant="outline">Step 1 of 4</Badge>
                <h2 className="text-xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
                  Battle basics
                </h2>
                <p className="text-sm leading-7 text-greyscale-500 dark:text-greyscale-400">
                  Give your battle a clear title and a detailed Lens prompt. Both contenders receive the same prompt.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                  Battle title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. GPT-4o vs Claude — Technical Writing"
                  maxLength={120}
                  className="w-full rounded-2xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-greyscale-900 outline-none transition-colors placeholder:text-greyscale-400 focus:border-status-blue dark:bg-surface-raised dark:text-greyscale-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                  Lens prompt
                </label>
                <textarea
                  value={taskPrompt}
                  onChange={(e) => setTaskPrompt(e.target.value)}
                  placeholder="Describe the task clearly. Be specific about format, constraints, and the success criteria you want evaluated."
                  rows={6}
                  className="w-full resize-none rounded-2xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-greyscale-900 outline-none transition-colors placeholder:text-greyscale-400 focus:border-status-blue dark:bg-surface-raised dark:text-greyscale-50"
                />
                <p className="mt-1 text-right text-xs text-greyscale-400">{taskPrompt.length} chars</p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 text-sm text-greyscale-500 transition-colors hover:text-greyscale-900 dark:hover:text-greyscale-0"
                >
                  Cancel
                </button>
                <Button

                  onClick={() => go(1)}
                  disabled={!canAdvanceStep0}
                  className="gap-2 w-auto"
                >
                  Next <ArrowRight size={15} />
                </Button>
              </div>
            </Card>
          )}

          {/* Step 1: Battle type */}
          {step === 1 && (
            <Card className="space-y-5 p-6">
              <div className="space-y-2">
                <Badge color="blue" variant="outline">Step 2 of 4</Badge>
                <h2 className="text-xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
                  Battle type
                </h2>
                <p className="text-sm leading-7 text-greyscale-500 dark:text-greyscale-400">
                  Choose who competes and who judges.
                </p>
              </div>

              <BattleTypeSelector value={battleType} onChange={handleBattleTypeChange} />

              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() => go(0)}
                  className="inline-flex items-center gap-2 text-sm text-greyscale-500 transition-colors hover:text-greyscale-900 dark:hover:text-greyscale-0"
                >
                  <ArrowLeft size={15} /> Back
                </button>
                <Button onClick={() => go(2)} className="gap-2 w-auto">
                  Next <ArrowRight size={15} />
                </Button>
              </div>
            </Card>
          )}

          {/* Step 2: Configuration */}
          {step === 2 && (
            <div className="space-y-4">
              <Card className="space-y-5 p-6">
                <div className="space-y-2">
                  <Badge color="blue" variant="outline">Step 3 of 4</Badge>
                  <h2 className="text-xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
                    Configuration
                  </h2>
                  <p className="text-sm leading-7 text-greyscale-500 dark:text-greyscale-400">
                    Set voter eligibility and optional AI handicap settings.
                  </p>
                </div>
                <VoterEligibilitySelector
                  battleType={battleType}
                  value={voterEligibility}
                  onChange={setVoterEligibility}
                />
              </Card>

              {showsHandicap && (
                <Card className="p-6">
                  <HandicapConfigPanel value={handicap} onChange={setHandicap} />
                </Card>
              )}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
                  {error}
                </div>
              )}

              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="inline-flex items-center gap-2 text-sm text-greyscale-500 transition-colors hover:text-greyscale-900 dark:hover:text-greyscale-0"
                >
                  <ArrowLeft size={15} /> Back
                </button>
                <Button

                  onClick={handleCreateBattle}
                  isLoading={submitting}
                  disabled={submitting}
                  className="gap-2 w-auto"
                >
                  <Swords size={15} /> Create Battle
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Invite contenders (post-creation) */}
          {step === 3 && createdBattleId && (
            <ContenderInviteStep
              battleId={createdBattleId}
              onDone={() => onSuccess(createdBattleSlug!)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
