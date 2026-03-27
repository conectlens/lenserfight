import { StepWizard } from '@lenserfight/ui/components'
import type { WizardStepConfig } from '@lenserfight/ui/components'
import { battlesService, workflowsService, lensesService } from '@lenserfight/data/repositories'
import type { WorkflowRecord } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useWizardStep } from '@lenserfight/ui/routing'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { GitBranch, Layers, Swords } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { BattleTypeSelector } from './BattleTypeSelector'
import { ContenderInviteStep } from './ContenderInviteStep'
import { HandicapConfigPanel } from './HandicapConfigPanel'
import { LensAssignmentStep } from './LensAssignmentStep'
import { VoterEligibilitySelector } from './VoterEligibilitySelector'

import type { AIHandicapConfig, BattleType, VoterEligibility } from '../types/battle.types'
import type { LensViewModel } from '@lenserfight/types'

// ─── Step config ─────────────────────────────────────────────────────────────

const WIZARD_STEPS: WizardStepConfig[] = [
  {
    label: 'Format',
    title: 'Choose battle format',
    description: 'Select whether you want to battle with a connected workflow or a single lens prompt.',
  },
  {
    label: 'Pick',
    title: 'Select your source',
    description: 'Choose which workflow or lens to use for this battle.',
  },
  {
    label: 'Basics',
    title: 'Battle basics',
    description: 'Give your battle a title and, if using a lens, a prompt.',
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

// ─── Component ───────────────────────────────────────────────────────────────

export const CreateBattleWizard: React.FC<CreateBattleWizardProps> = ({ onSuccess, onClose }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { step, goToStep } = useWizardStep({ maxStep: 6 })

  const [direction, setDirection] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 0 — format choice
  const [battleFormat, setBattleFormat] = useState<'workflow' | 'lens' | null>(null)

  // Step 1 — source selection
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)
  const [selectedWorkflowTitle, setSelectedWorkflowTitle] = useState('')
  const [selectedLensId, setSelectedLensId] = useState<string | null>(null)
  const [selectedLensTitle, setSelectedLensTitle] = useState('')

  // Steps 2–4 — battle config
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [battleType, setBattleType] = useState<BattleType>('human_vs_human_open_votes')
  const [voterEligibility, setVoterEligibility] = useState<VoterEligibility>('open')
  const [handicap, setHandicap] = useState<AIHandicapConfig>(DEFAULT_HANDICAP)

  // Post-creation
  const [createdBattleSlug, setCreatedBattleSlug] = useState<string | null>(null)
  const [contenderAId, setContenderAId] = useState<string | undefined>()
  const [contenderAName, setContenderAName] = useState<string | undefined>()
  const [contenderBId, setContenderBId] = useState<string | undefined>()
  const [contenderBName, setContenderBName] = useState<string | undefined>()

  const battleIdFromUrl = searchParams.get('battleId')
  const preselectedWorkflowId = searchParams.get('workflow_id')

  // Auto-select from ?workflow_id param (emitted by WorkflowBuilderPage "Battle it" button)
  useEffect(() => {
    if (preselectedWorkflowId && !battleIdFromUrl) {
      setBattleFormat('workflow')
      setSelectedWorkflowId(preselectedWorkflowId)
      goToStep(1)
    }
  }, []) // eslint-disable-line

  // Guard: if URL claims step >= 5 but there's no battleId, reset to step 0
  useEffect(() => {
    if (step >= 5 && !battleIdFromUrl) {
      navigate('/battles/create', { replace: true })
    }
  }, []) // eslint-disable-line

  // ── Data fetching ────────────────────────────────────────────────────────

  const { data: workflows = [], isLoading: loadingWorkflows } = useQuery({
    queryKey: ['battle-wizard-workflows', user?.id],
    queryFn: () => workflowsService.listByLenser(user?.id ?? ''),
    enabled: !!user?.id && battleFormat === 'workflow' && step === 1,
    staleTime: 1000 * 60,
  })

  const { data: lensesData, isLoading: loadingLenses } = useQuery({
    queryKey: ['battle-wizard-lenses', user?.id],
    queryFn: () => lensesService.getPersonalFeed(user?.id ?? '', 0, 30),
    enabled: !!user?.id && battleFormat === 'lens' && step === 1,
    staleTime: 1000 * 60,
  })
  const myLenses: LensViewModel[] = (lensesData?.data ?? []) as LensViewModel[]

  // ── Navigation ───────────────────────────────────────────────────────────

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

  // ── Validation ───────────────────────────────────────────────────────────

  const showsHandicap = AI_BATTLE_TYPES.includes(battleType)

  const canProceed = (() => {
    if (step === 0) return battleFormat !== null
    if (step === 1) {
      return battleFormat === 'workflow' ? !!selectedWorkflowId : !!selectedLensId
    }
    if (step === 2) return title.trim().length >= 3
    return true
  })()

  // ── Create battle ────────────────────────────────────────────────────────

  const handleCreateBattle = async () => {
    if (!canProceed) return
    setSubmitting(true)
    setError(null)
    try {
      const resolvedPrompt = battleFormat === 'workflow'
        ? `Workflow battle: ${selectedWorkflowTitle || selectedWorkflowId}`
        : `Lens battle: ${selectedLensTitle || selectedLensId}`

      const battle = await battlesService.createBattle({
        title: title.trim(),
        task_prompt: resolvedPrompt,
        battle_type: battleType,
        voter_eligibility: voterEligibility,
        handicap: showsHandicap ? handicap : undefined,
        ...(battleFormat === 'workflow' && selectedWorkflowId ? { workflow_id: selectedWorkflowId } : {}),
        ...(battleFormat === 'lens' && selectedLensId ? { lens_id: selectedLensId } : {}),
      })
      setCreatedBattleSlug(battle.slug)
      setDirection(1)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('step', '5')
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

  // ── Post-creation steps (5–6) ────────────────────────────────────────────

  if (step >= 5) {
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
            {step === 5 && battleIdFromUrl && (
              <ContenderInviteStep
                battleId={battleIdFromUrl}
                onDone={(aId, aName, bId, bName) => {
                  setContenderAId(aId)
                  setContenderAName(aName)
                  setContenderBId(bId)
                  setContenderBName(bName)
                  go(6)
                }}
              />
            )}
            {step === 6 && battleIdFromUrl && (
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

  // ── Pre-creation steps (0–4) ─────────────────────────────────────────────

  return (
    <div className="w-full">
      <StepWizard
        steps={WIZARD_STEPS}
        currentStep={step}
        onNext={() => go(step + 1)}
        onBack={() => go(step - 1)}
        onComplete={handleCreateBattle}
        onCancel={onClose}
        canProceed={canProceed}
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

            {/* ── Step 0: Format chooser ────────────────────────────── */}
            {step === 0 && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setBattleFormat('workflow')}
                  className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition-colors ${
                    battleFormat === 'workflow'
                      ? 'border-status-blue bg-status-blue/5'
                      : 'border-surface-border hover:border-greyscale-300 dark:hover:border-greyscale-600'
                  }`}
                >
                  <GitBranch
                    size={28}
                    className={battleFormat === 'workflow' ? 'text-status-blue' : 'text-greyscale-400'}
                  />
                  <div>
                    <p className="font-semibold text-sm text-greyscale-900 dark:text-greyscale-50">
                      Workflow Battle
                    </p>
                    <p className="text-xs text-greyscale-400 mt-0.5">
                      Use a connected lens workflow
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBattleFormat('lens')}
                  className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition-colors ${
                    battleFormat === 'lens'
                      ? 'border-status-blue bg-status-blue/5'
                      : 'border-surface-border hover:border-greyscale-300 dark:hover:border-greyscale-600'
                  }`}
                >
                  <Layers
                    size={28}
                    className={battleFormat === 'lens' ? 'text-status-blue' : 'text-greyscale-400'}
                  />
                  <div>
                    <p className="font-semibold text-sm text-greyscale-900 dark:text-greyscale-50">
                      Lens Battle
                    </p>
                    <p className="text-xs text-greyscale-400 mt-0.5">
                      Use a single prompt lens
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* ── Step 1: Workflow picker ───────────────────────────── */}
            {step === 1 && battleFormat === 'workflow' && (
              <div className="space-y-2">
                {loadingWorkflows && Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-2xl bg-surface-raised animate-pulse" />
                ))}
                {!loadingWorkflows && workflows.length === 0 && (
                  <p className="py-8 text-center text-sm text-greyscale-400">
                    No workflows found. Create one first from the Workflows section.
                  </p>
                )}
                {!loadingWorkflows && (workflows as WorkflowRecord[]).map((wf) => (
                  <button
                    key={wf.id}
                    type="button"
                    onClick={() => { setSelectedWorkflowId(wf.id); setSelectedWorkflowTitle(wf.title) }}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${
                      selectedWorkflowId === wf.id
                        ? 'border-status-blue bg-status-blue/5'
                        : 'border-surface-border hover:border-greyscale-300 dark:hover:border-greyscale-600'
                    }`}
                  >
                    <GitBranch
                      size={16}
                      className={selectedWorkflowId === wf.id ? 'text-status-blue flex-shrink-0' : 'text-greyscale-400 flex-shrink-0'}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                        {wf.title}
                      </p>
                      {wf.description && (
                        <p className="truncate text-xs text-greyscale-400">{wf.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ── Step 1: Lens picker ───────────────────────────────── */}
            {step === 1 && battleFormat === 'lens' && (
              <div className="space-y-2">
                {loadingLenses && Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-2xl bg-surface-raised animate-pulse" />
                ))}
                {!loadingLenses && myLenses.length === 0 && (
                  <p className="py-8 text-center text-sm text-greyscale-400">
                    No lenses found. Create a lens first.
                  </p>
                )}
                {!loadingLenses && myLenses.map((lens) => (
                  <button
                    key={lens.id}
                    type="button"
                    onClick={() => { setSelectedLensId(lens.id); setSelectedLensTitle(lens.title) }}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${
                      selectedLensId === lens.id
                        ? 'border-status-blue bg-status-blue/5'
                        : 'border-surface-border hover:border-greyscale-300 dark:hover:border-greyscale-600'
                    }`}
                  >
                    <Layers
                      size={16}
                      className={selectedLensId === lens.id ? 'text-status-blue flex-shrink-0' : 'text-greyscale-400 flex-shrink-0'}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                        {lens.title}
                      </p>
                      {lens.visibility !== 'public' && (
                        <p className="text-xs text-greyscale-400 capitalize">{lens.visibility}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ── Step 2: Battle basics ─────────────────────────────── */}
            {step === 2 && (
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
                    Description <span className="font-normal text-greyscale-400">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add context for participants and voters, e.g. what success looks like."
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-greyscale-900 outline-none transition-colors placeholder:text-greyscale-400 focus:border-status-blue dark:bg-surface-raised dark:text-greyscale-50"
                  />
                </div>
              </div>
            )}

            {/* ── Step 3: Battle type ───────────────────────────────── */}
            {step === 3 && (
              <BattleTypeSelector value={battleType} onChange={handleBattleTypeChange} />
            )}

            {/* ── Step 4: Configuration ─────────────────────────────── */}
            {step === 4 && (
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
                  <div className="rounded-2xl border border-status-red/20 bg-status-red/5 px-4 py-3 text-sm text-status-red">
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
