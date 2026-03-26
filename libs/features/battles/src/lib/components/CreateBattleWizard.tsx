import { StepWizard } from '@lenserfight/ui/components'
import type { WizardStepConfig } from '@lenserfight/ui/components'
import { battlesService } from '@lenserfight/data/repositories'
import { useWizardStep } from '@lenserfight/ui/routing'
import { AnimatePresence, motion } from 'framer-motion'
import { Swords } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { BattleTypeSelector } from './BattleTypeSelector'
import { ContenderInviteStep } from './ContenderInviteStep'
import { HandicapConfigPanel } from './HandicapConfigPanel'
import { LensAssignmentStep } from './LensAssignmentStep'
import { VoterEligibilitySelector } from './VoterEligibilitySelector'

import type { AIHandicapConfig, BattleType, VoterEligibility } from '../types/battle.types'

const WIZARD_STEPS: WizardStepConfig[] = [
  {
    label: 'Basics',
    title: 'Battle basics',
    description: 'Give your battle a clear title and a detailed Lens prompt. Both contenders receive the same prompt.',
  },
  {
    label: 'Battle type',
    title: 'Battle type',
    description: 'Choose who competes and who judges.',
  },
  {
    label: 'Configuration',
    title: 'Configuration',
    description: 'Set voter eligibility and optional AI handicap settings.',
  },
  {
    label: 'Contenders',
    title: 'Invite contenders',
    description: 'Add the two contenders who will compete in this battle.',
  },
  {
    label: 'Assign Lenses',
    title: 'Assign Lenses',
    description: 'Optionally assign lenses to each contender.',
  },
]

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
 * Step state is fully URL-driven via `?step=N`. The `battleId` for
 * post-creation steps (3–4) is encoded as `?battleId=<uuid>` so the
 * wizard survives a hard refresh.
 *
 * Can be rendered:
 * - Inside a `ModalRoute` (Dialog wrapper provided externally)
 * - Directly as a full-page component via `CreateBattlePage`
 */
export const CreateBattleWizard: React.FC<CreateBattleWizardProps> = ({ onSuccess, onClose }) => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { step, goToStep } = useWizardStep({ maxStep: 4 })

  // Direction is animation-only — not URL state
  const [direction, setDirection] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state (steps 0–2)
  const [title, setTitle] = useState('')
  const [taskPrompt, setTaskPrompt] = useState('')
  const [battleType, setBattleType] = useState<BattleType>('human_vs_human_open_votes')
  const [voterEligibility, setVoterEligibility] = useState<VoterEligibility>('open')
  const [handicap, setHandicap] = useState<AIHandicapConfig>(DEFAULT_HANDICAP)

  // Post-creation state — battleId is the URL source of truth for recovery;
  // createdBattleSlug is only needed at the final onSuccess() call
  const [createdBattleSlug, setCreatedBattleSlug] = useState<string | null>(null)

  // Contender IDs — populated after step 3 (invite) completes
  const [contenderAId, setContenderAId] = useState<string | undefined>()
  const [contenderAName, setContenderAName] = useState<string | undefined>()
  const [contenderBId, setContenderBId] = useState<string | undefined>()
  const [contenderBName, setContenderBName] = useState<string | undefined>()

  // Read battleId from URL — this is the recovery source of truth for steps 3–4
  const battleIdFromUrl = searchParams.get('battleId')

  // Guard: if URL claims step >= 3 but there's no battleId, reset to step 0.
  // This handles a hard refresh after clearing the URL or sharing a partial link.
  useEffect(() => {
    if (step >= 3 && !battleIdFromUrl) {
      navigate('/battles/create', { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const showsHandicap = AI_BATTLE_TYPES.includes(battleType)

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1)
    goToStep(next)
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
      setCreatedBattleSlug(battle.slug)
      setDirection(1)
      // Encode both step and battleId atomically so refresh at step 3 recovers correctly
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('step', '3')
          next.set('battleId', battle.id)
          return next
        },
        { replace: false }
      )
    } catch (e) {
      setError((e as Error).message ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Steps 3–4 are post-creation; their child components own navigation.
  // Render them outside the StepWizard to avoid overriding their own nav.
  if (step >= 3) {
    return (
      <div className="w-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {step === 3 && battleIdFromUrl && (
              <ContenderInviteStep
                battleId={battleIdFromUrl}
                onDone={(aId, aName, bId, bName) => {
                  setContenderAId(aId)
                  setContenderAName(aName)
                  setContenderBId(bId)
                  setContenderBName(bName)
                  go(4)
                }}
              />
            )}
            {step === 4 && battleIdFromUrl && (
              <LensAssignmentStep
                battleId={battleIdFromUrl}
                contenderAId={contenderAId}
                contenderAName={contenderAName}
                contenderBId={contenderBId}
                contenderBName={contenderBName}
                onDone={() => onSuccess(createdBattleSlug!)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="w-full">
      <StepWizard
        steps={WIZARD_STEPS}
        currentStep={step}
        onNext={() => go(step + 1)}
        onBack={() => go(step - 1)}
        onComplete={handleCreateBattle}
        onCancel={onClose}
        canProceed={step === 0 ? canAdvanceStep0 : true}
        isCompleting={submitting}
        completeLabel="Create Battle"
        completeIcon={<Swords size={15} />}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {step === 0 && (
              <div className="space-y-4">
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
              </div>
            )}

            {step === 1 && (
              <BattleTypeSelector value={battleType} onChange={handleBattleTypeChange} />
            )}

            {step === 2 && (
              <div className="space-y-4">
                <VoterEligibilitySelector
                  battleType={battleType}
                  value={voterEligibility}
                  onChange={setVoterEligibility}
                />
                {showsHandicap && (
                  <HandicapConfigPanel value={handicap} onChange={setHandicap} />
                )}
                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
                    {error}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </StepWizard>
    </div>
  )
}
