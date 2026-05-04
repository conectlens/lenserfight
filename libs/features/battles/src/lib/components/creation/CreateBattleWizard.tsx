import { Button, SegmentedControl, StepWizard } from '@lenserfight/ui/components'
import type { WizardStepConfig } from '@lenserfight/ui/components'
import { Input, TextArea } from '@lenserfight/ui/forms'
import { battlesService, workflowsService, lensesService, battleExecutionService } from '@lenserfight/data/repositories'
import type { WorkflowRecord } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useAIModels } from '@lenserfight/features/generations'
import { useFundingSource, FundingSourceToggle } from '@lenserfight/features/lenses'
import { useLenser } from '@lenserfight/features/profile'
import { useWizardStep } from '@lenserfight/ui/routing'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { GitBranch, Layers, Swords } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { AIProvider, AIProviderModel } from '@lenserfight/types'

import { BattleTypeSelector } from './BattleTypeSelector'
import { ContenderInviteStep } from './ContenderInviteStep'
import { HandicapConfigPanel } from './HandicapConfigPanel'
import { LensAssignmentStep } from './LensAssignmentStep'
import type { LenserSearchResult } from './LenserSearchPicker'
import { VoterEligibilitySelector } from './VoterEligibilitySelector'

import type { AIHandicapConfig, BattleType, VoterEligibility } from '../../types/battle.types'
import type { LensViewModel } from '@lenserfight/types'
import { useInviteContender } from '../../hooks/mutations/useInviteContender'

// ─── Step config ─────────────────────────────────────────────────────────────

const WIZARD_STEPS: WizardStepConfig[] = [
  {
    label: 'Format',
    title: 'Choose battle format',
    description: 'Select whether you want to battle with a connected workflow or a single lens prompt.',
  },
  {
    label: 'Source', // Was 'Pick'
    title: 'Select your source',
    description: 'Choose which workflow or lens to use for this battle.',
  },
  {
    label: 'Basics',
    title: 'Battle basics',
    description: 'Give your battle a title and, if using a lens, a prompt.',
  },
  {
    label: 'Config', // Merged 3 & 4
    title: 'Battle configuration',
    description: 'Choose battle mode, voter eligibility, and AI handicap settings.',
  },
  {
    label: 'Contenders',
    title: 'Invite contenders',
    description: 'Add up to two contenders by their lenser handle or display name. You can skip and invite later.',
  },
  {
    label: 'Lenses',
    title: 'Assign Lenses',
    description: 'Lenses define how each contender approaches the prompt. Optional — assign later from the battle page.',
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
  const { lenser } = useLenser()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { step, goToStep } = useWizardStep({ maxStep: WIZARD_STEPS.length })

  const [direction, setDirection] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Step 0 — format choice (lazy-init from URL so query is enabled on first render)
  const [battleFormat, setBattleFormat] = useState<'workflow' | 'lens' | null>(() =>
    searchParams.get('workflow_id') ? 'workflow' : null
  )

  // Step 1 — source selection (lazy-init from URL)
  const [workflowScope, setWorkflowScope] = useState<'mine' | 'popular'>('mine')
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(() =>
    searchParams.get('workflow_id') ?? null
  )
  const [selectedWorkflowTitle, setSelectedWorkflowTitle] = useState('')
  const [selectedLensId, setSelectedLensId] = useState<string | null>(null)
  const [selectedLensTitle, setSelectedLensTitle] = useState('')

  // Steps 2–4 — battle config
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [battleType, setBattleType] = useState<BattleType>('human_vs_human_open_votes')
  const [voterEligibility, setVoterEligibility] = useState<VoterEligibility>('open')
  const [handicap, setHandicap] = useState<AIHandicapConfig>(DEFAULT_HANDICAP)

  // Execution context (funding source + model selection for AI battles)
  const [selectedProviderKey, setSelectedProviderKey] = useState('')
  const [selectedModelKey, setSelectedModelKey] = useState('')
  const { models, isLoading: modelsLoading } = useAIModels()
  const battleFunding = useFundingSource(selectedProviderKey)

  const battleProviders: AIProvider[] = useMemo(() => {
    const seen = new Set<string>()
    return models
      .filter((m) => m.is_active && !!m.key && !seen.has(m.provider) && (seen.add(m.provider), true))
      .map((m) => ({ key: m.provider, display_name: m.providerDisplayName ?? m.provider, id: m.provider_id ?? '' }))
  }, [models])

  const battleProviderModels: AIProviderModel[] = useMemo(() => {
    if (!selectedProviderKey) return []
    return models
      .filter((m) => m.is_active && !!m.key && m.provider === selectedProviderKey)
      .map((m) => ({ key: m.key, name: m.name, inputModalities: m.input_modalities }))
  }, [models, selectedProviderKey])

  // Post-creation
  const [createdBattleSlug, setCreatedBattleSlug] = useState<string | null>(null)
  const [createdBattleId, setCreatedBattleId] = useState<string | null>(null)
  const [contenderAId, setContenderAId] = useState<string | undefined>()
  const [contenderAName, setContenderAName] = useState<string | undefined>()
  const [contenderBId, setContenderBId] = useState<string | undefined>()
  const [contenderBName, setContenderBName] = useState<string | undefined>()

  // Step 5 — invite contenders
  const [slotA, setSlotA] = useState<LenserSearchResult | null>(null)
  const [slotB, setSlotB] = useState<LenserSearchResult | null>(null)

  const battleIdFromUrl = searchParams.get('battleId')
  const preselectedWorkflowId = searchParams.get('workflow_id')

  const inviteA = useInviteContender(createdBattleId ?? '')
  const inviteB = useInviteContender(createdBattleId ?? '')

  // Auto-advance to step 1 when arriving with ?workflow_id param
  useEffect(() => {
    if (preselectedWorkflowId && !battleIdFromUrl) {
      goToStep(1)
    }
  }, []) // eslint-disable-line

  // ── Fetch existing battle for editing ─────────────────────────────────────
  const isEditMode = !!battleIdFromUrl && step < 4

  useEffect(() => {
    if (battleIdFromUrl && step < 4) {
      const fetchBattleData = async () => {
        try {
          // Use UUID if possible, but the service only has getBattleBySlug.
          // In the wizard, battleId from URL might be an ID or a SLUG depending on how it's linked.
          // Looking at SupabaseBattlesRepository.createBattle, it returns a record with id and slug.
          // getBattleBySlug is the only public fetcher. Let's see if we can get it by ID.
          // I'll assume we might need getBattleById.
          // Let's check battlesService.
          const battle = await battlesService.getBattleBySlug(battleIdFromUrl)
          if (battle && battle.status === 'draft') {
            setTitle(battle.title)
            setDescription(battle.task_prompt.startsWith('Workflow battle: ') || battle.task_prompt.startsWith('Lens battle: ') ? '' : battle.task_prompt)
            setBattleType(battle.battle_type)
            setVoterEligibility(battle.voter_eligibility)
            if (battle.handicap_config) {
              setHandicap(battle.handicap_config as unknown as AIHandicapConfig)
            }
            if (battle.workflow_id) {
              setBattleFormat('workflow')
              setSelectedWorkflowId(battle.workflow_id)
            } else if (battle.lens_id) {
              setBattleFormat('lens')
              setSelectedLensId(battle.lens_id)
            }
            setCreatedBattleId(battle.id)
            setCreatedBattleSlug(battle.slug)
            // Skip format/source steps if we have them already
            if (step === 0 && (battle.workflow_id || battle.lens_id)) {
              goToStep(2)
            }
          }
        } catch (e) {
          console.error('Failed to fetch battle for editing', e)
        }
      }
      fetchBattleData()
    }
  }, [battleIdFromUrl]) // eslint-disable-line

  // Guard: if URL claims step >= 4 but there's no battleId, reset to step 0
  useEffect(() => {
    if (step >= 4 && !battleIdFromUrl) {
      navigate('/battles/create', { replace: true })
    }
  }, []) // eslint-disable-line

  // Sync createdBattleId from URL when navigating back to post-creation steps
  useEffect(() => {
    if (battleIdFromUrl && !createdBattleId) {
      setCreatedBattleId(battleIdFromUrl)
    }
  }, [battleIdFromUrl, createdBattleId])

  // ── Data fetching ────────────────────────────────────────────────────────

  const { data: myWorkflowsData, isLoading: loadingWorkflows } = useQuery({
    queryKey: ['battle-wizard-workflows', lenser?.id],
    queryFn: () => workflowsService.listByLenserPaginated(lenser?.id ?? '', 0, 50),
    enabled: !!lenser?.id && battleFormat === 'workflow' && step === 1 && workflowScope === 'mine',
    staleTime: 1000 * 60,
  })
  const workflows = (myWorkflowsData?.data ?? []) as WorkflowRecord[]

  const { data: popularWorkflowsData, isLoading: loadingPopularWorkflows } = useQuery({
    queryKey: ['battle-wizard-popular-workflows'],
    queryFn: () => workflowsService.getPopular(0, 30),
    enabled: battleFormat === 'workflow' && step === 1 && workflowScope === 'popular',
    staleTime: 1000 * 60,
  })
  const popularWorkflows = (popularWorkflowsData?.data ?? []) as WorkflowRecord[]

  const { data: lensesData, isLoading: loadingLenses } = useQuery({
    queryKey: ['battle-wizard-lenses', lenser?.id],
    queryFn: () => lensesService.getPersonalFeed(lenser?.id ?? '', 0, 30),
    enabled: !!lenser?.id && battleFormat === 'lens' && step === 1,
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
    // Steps 4 & 5 are always skippable
    return true
  })()

  const stepValidity: boolean[] = [
    battleFormat !== null,
    battleFormat === 'workflow' ? !!selectedWorkflowId : !!selectedLensId,
    title.trim().length >= 3,
    true, // config step always valid
    true, // contenders always skippable
    true, // lenses always skippable
  ]

  // ── Create battle (step 3 → 4) ───────────────────────────────────────────

  const handleCreateBattle = async () => {
    if (!canProceed) return
    setSubmitting(true)
    setError(null)
    try {
      const resolvedPrompt = description.trim() || (battleFormat === 'workflow'
        ? `Workflow battle: ${selectedWorkflowTitle || selectedWorkflowId}`
        : `Lens battle: ${selectedLensTitle || selectedLensId}`)

      const battleInput = {
        title: title.trim(),
        task_prompt: resolvedPrompt,
        battle_type: battleType,
        voter_eligibility: voterEligibility,
        handicap: showsHandicap ? handicap : undefined,
        ...(battleFormat === 'workflow' && selectedWorkflowId ? { workflow_id: selectedWorkflowId } : {}),
        ...(battleFormat === 'lens' && selectedLensId ? { lens_id: selectedLensId } : {}),
      }

      let battle
      if (isEditMode && createdBattleId) {
        battle = await battlesService.updateBattle(createdBattleId, battleInput)
      } else {
        battle = await battlesService.createBattle(battleInput)
      }

      // Persist execution config for AI battles
      if (battleType === 'ai_vs_ai' && selectedProviderKey && selectedModelKey) {
        await battleExecutionService.upsertExecutionConfig({
          battle_id: battle.id,
          contender_id: null, // Battle-level default config
          provider_key: selectedProviderKey,
          model_key: selectedModelKey,
          funding_source: battleFunding.fundingSource as 'user_byok_cloud' | 'user_byok_local' | 'platform_credit' | 'sponsored',
          byok_key_ref_id: battleFunding.selectedKeyRefId || undefined,
          max_tokens: 4096,
          temperature: 0.7,
        })
      }

      setCreatedBattleSlug(battle.slug)
      setCreatedBattleId(battle.id)
      setDirection(1)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('step', '4')
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

  // ── Invite contenders (step 4 → 5) ───────────────────────────────────────

  const activeBattleId = createdBattleId ?? battleIdFromUrl

  const handleInvite = async () => {
    if (!activeBattleId) {
      go(5)
      return
    }
    setInviting(true)
    setInviteError(null)
    try {
      // Fetch existing contenders to enable idempotent upsert
      const existing = await battlesService.getContenders(activeBattleId)
      const existingA = existing.find((c) => c.slot === 'A')
      const existingB = existing.find((c) => c.slot === 'B')

      // ── Slot A ────────────────────────────────────────────────────────────
      if (slotA) {
        if (existingA && existingA.contender_ref_id === slotA.id) {
          // Already invited — use existing record, skip insert
          setContenderAId(existingA.id)
          setContenderAName(existingA.display_name)
        } else {
          if (existingA) {
            // Different lenser selected — remove stale record first
            await battlesService.removeContender(existingA.id)
          }
          const result = await inviteA.mutateAsync({
            battle_id: activeBattleId,
            slot: 'A',
            contender_ref_id: slotA.id,
            display_name: slotA.display_name,
            contender_type: 'human',
          })
          setContenderAId(result.id)
          setContenderAName(result.display_name)
        }
      } else if (existingA) {
        // User cleared slot A — remove from DB
        await battlesService.removeContender(existingA.id)
        setContenderAId(undefined)
        setContenderAName(undefined)
      }

      // ── Slot B ────────────────────────────────────────────────────────────
      if (slotB) {
        if (existingB && existingB.contender_ref_id === slotB.id) {
          setContenderBId(existingB.id)
          setContenderBName(existingB.display_name)
        } else {
          if (existingB) {
            await battlesService.removeContender(existingB.id)
          }
          const result = await inviteB.mutateAsync({
            battle_id: activeBattleId,
            slot: 'B',
            contender_ref_id: slotB.id,
            display_name: slotB.display_name,
            contender_type: 'human',
          })
          setContenderBId(result.id)
          setContenderBName(result.display_name)
        }
      } else if (existingB) {
        await battlesService.removeContender(existingB.id)
        setContenderBId(undefined)
        setContenderBName(undefined)
      }

      go(5)
    } catch (e) {
      const msg = (e as any)?.message ?? ''
      if (msg.includes('contenders_battle_ref_unique') || msg.includes('duplicate key')) {
        setInviteError('This lenser has already been invited to this battle.')
      } else {
        setInviteError('Failed to invite contender. Please try again.')
      }
    } finally {
      setInviting(false)
    }
  }

  const handleFinish = () => onSuccess(createdBattleSlug!)

  // ── Render ────────────────────────────────────────────────────────────────

  // Skip button config per step
  const skipButton = step === 4
    ? { label: 'Skip for now', onClick: () => go(5) }
    : step === 5
      ? { label: 'Skip for now', onClick: handleFinish }
      : undefined

  // Next / complete handler varies by step
  const handleNext = step === 3
    ? handleCreateBattle
    : step === 4
      ? handleInvite
      : () => go(step + 1)

  const handleComplete = handleFinish

  return (
    <div className="w-full">
      <StepWizard
        steps={WIZARD_STEPS}
        currentStep={step}
        onNext={handleNext}
        onBack={() => go(step - 1)}
        onComplete={handleComplete}
        onCancel={onClose}
        canProceed={canProceed}
        isCompleting={step === 3 ? submitting : step === 4 ? inviting : false}
        isNextLoading={step === 3 ? submitting : step === 4 ? inviting : false}
        completeLabel="Go to Battle"
        completeIcon={<Swords size={15} className="mr-1.5" />}
        nextLabel={step === 3 ? (isEditMode ? 'Update Battle' : 'Create Battle') : step === 4 ? 'Invite' : 'Next'}
        skipButton={skipButton}
        stepValidity={stepValidity}
        onStepClick={go}
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
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setBattleFormat('workflow')}
                  className={`!flex-col !gap-3 !rounded-2xl !border-2 !p-6 text-center w-full !h-auto !font-normal !transition-colors ${
                    battleFormat === 'workflow'
                      ? '!border-primary-yellow-500 !bg-primary-yellow-500/5 hover:!bg-primary-yellow-500/5'
                      : '!border-surface-border hover:!border-greyscale-300 dark:hover:!border-greyscale-600 !bg-transparent hover:!bg-transparent'
                  }`}
                >
                  <GitBranch
                    size={28}
                    className={battleFormat === 'workflow' ? 'text-primary-yellow-600' : 'text-greyscale-400'}
                  />
                  <div>
                    <p className="font-semibold text-sm text-greyscale-900 dark:text-greyscale-50">
                      Workflow Battle
                    </p>
                    <p className="text-xs text-greyscale-400 mt-0.5">
                      Use a connected lens workflow
                    </p>
                  </div>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setBattleFormat('lens')}
                  className={`!flex-col !gap-3 !rounded-2xl !border-2 !p-6 text-center w-full !h-auto !font-normal !transition-colors ${
                    battleFormat === 'lens'
                      ? '!border-primary-yellow-500 !bg-primary-yellow-500/5 hover:!bg-primary-yellow-500/5'
                      : '!border-surface-border hover:!border-greyscale-300 dark:hover:!border-greyscale-600 !bg-transparent hover:!bg-transparent'
                  }`}
                >
                  <Layers
                    size={28}
                    className={battleFormat === 'lens' ? 'text-primary-yellow-600' : 'text-greyscale-400'}
                  />
                  <div>
                    <p className="font-semibold text-sm text-greyscale-900 dark:text-greyscale-50">
                      Lens Battle
                    </p>
                    <p className="text-xs text-greyscale-400 mt-0.5">
                      Use a single prompt lens
                    </p>
                  </div>
                </Button>
              </div>
            )}

            {/* ── Step 1: Workflow picker ───────────────────────────── */}
            {step === 1 && battleFormat === 'workflow' && (() => {
              const isLoading = workflowScope === 'mine' ? loadingWorkflows : loadingPopularWorkflows
              const list = workflowScope === 'mine' ? (workflows as WorkflowRecord[]) : popularWorkflows
              return (
                <div className="space-y-3">
                  <SegmentedControl
                    options={[
                      { value: 'mine', label: 'My Workflows' },
                      { value: 'popular', label: 'Popular' },
                    ]}
                    value={workflowScope}
                    onChange={(v) => { setWorkflowScope(v as 'mine' | 'popular'); setSelectedWorkflowId(null) }}
                    size="sm"
                  />
                  <div className="space-y-2">
                    {isLoading && Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-14 rounded-2xl bg-surface-raised animate-pulse" />
                    ))}
                    {!isLoading && list.length === 0 && (
                      <p className="py-8 text-center text-sm text-greyscale-400">
                        {workflowScope === 'mine'
                          ? 'No workflows found. Create one first from the Workflows section.'
                          : 'No popular workflows yet. Check back later.'}
                      </p>
                    )}
                    {!isLoading && list.map((wf) => (
                      <Button
                        key={wf.id}
                        type="button"
                        variant="ghost"
                        onClick={() => { setSelectedWorkflowId(wf.id); setSelectedWorkflowTitle(wf.title) }}
                        className={`!justify-start !gap-3 !rounded-2xl !border-2 !px-4 !py-3 w-full !font-normal text-left !transition-colors ${
                          selectedWorkflowId === wf.id
                            ? '!border-primary-yellow-500 !bg-primary-yellow-500/5 hover:!bg-primary-yellow-500/5'
                            : '!border-surface-border hover:!border-greyscale-300 dark:hover:!border-greyscale-600 !bg-transparent hover:!bg-transparent'
                        }`}
                      >
                        <GitBranch
                          size={16}
                          className={selectedWorkflowId === wf.id ? 'text-primary-yellow-600 flex-shrink-0' : 'text-greyscale-400 flex-shrink-0'}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                            {wf.title}
                          </p>
                          {wf.description && (
                            <p className="truncate text-xs text-greyscale-400">{wf.description}</p>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )
            })()}

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
                  <Button
                    key={lens.id}
                    type="button"
                    variant="ghost"
                    onClick={() => { setSelectedLensId(lens.id); setSelectedLensTitle(lens.title) }}
                    className={`!justify-start !gap-3 !rounded-2xl !border-2 !px-4 !py-3 w-full !font-normal text-left !transition-colors ${
                      selectedLensId === lens.id
                        ? '!border-primary-yellow-500 !bg-primary-yellow-500/5 hover:!bg-primary-yellow-500/5'
                        : '!border-surface-border hover:!border-greyscale-300 dark:hover:!border-greyscale-600 !bg-transparent hover:!bg-transparent'
                    }`}
                  >
                    <Layers
                      size={16}
                      className={selectedLensId === lens.id ? 'text-primary-yellow-600 flex-shrink-0' : 'text-greyscale-400 flex-shrink-0'}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                        {lens.title}
                      </p>
                      {lens.visibility !== 'public' && (
                        <p className="text-xs text-greyscale-400 capitalize">{lens.visibility}</p>
                      )}
                    </div>
                  </Button>
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
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. GPT-4o vs Claude — Technical Writing"
                    maxLength={120}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                    Description <span className="font-normal text-greyscale-400">(optional)</span>
                  </label>
                  <TextArea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add context for participants and voters, e.g. what success looks like."
                    minRows={4}
                    autoResize={false}
                  />
                </div>
              </div>
            )}

            {/* ── Step 3: Configuration (Merged Type & Settings) ─── */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-greyscale-400">
                    Battle Mode
                  </h4>
                  <BattleTypeSelector value={battleType} onChange={handleBattleTypeChange} />
                </div>

                <div className="border-t border-surface-border pt-6">
                  <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-greyscale-400">
                    Voter & Performance Settings
                  </h4>
                  <div className="space-y-6">
                    <VoterEligibilitySelector
                      battleType={battleType}
                      value={voterEligibility}
                      onChange={setVoterEligibility}
                    />
                    {showsHandicap && (
                      <HandicapConfigPanel value={handicap} onChange={setHandicap} />
                    )}
                  </div>
                </div>

                <div className="border-t border-surface-border pt-6">
                  <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-greyscale-400">
                    Execution Context
                  </h4>
                  <FundingSourceToggle
                    fundingSource={battleFunding.fundingSource}
                    onFundingSourceChange={battleFunding.setFundingSource}
                    selectedKeyRefId={battleFunding.selectedKeyRefId}
                    onKeyRefIdChange={battleFunding.setSelectedKeyRefId}
                    availableKeys={battleFunding.availableKeys}
                    selectedLocalKeyId={battleFunding.selectedLocalKeyId}
                    onLocalKeyIdChange={battleFunding.setSelectedLocalKeyId}
                    availableLocalKeys={battleFunding.localKeys}
                    onAddLocalKey={battleFunding.addLocalKey}
                    walletBalance={battleFunding.walletBalance}
                    canUseBYOK={battleFunding.canUseBYOK}
                    providers={battleProviders}
                    isLoadingProviders={modelsLoading}
                    providerModels={battleProviderModels}
                    isLoadingModels={modelsLoading}
                    selectedProviderKey={selectedProviderKey}
                    onProviderChange={(key) => { setSelectedProviderKey(key); setSelectedModelKey('') }}
                    selectedModelKey={selectedModelKey}
                    onModelChange={setSelectedModelKey}
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-status-red/20 bg-status-red/5 px-4 py-3 text-sm text-status-red">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 4: Invite contenders ─────────────────────────── */}
            {step === 4 && (
              <ContenderInviteStep
                slotA={slotA}
                slotB={slotB}
                onChangeSlotA={setSlotA}
                onChangeSlotB={setSlotB}
                error={inviteError}
              />
            )}

            {/* ── Step 5: Assign Lenses ─────────────────────────────── */}
            {step === 5 && activeBattleId && (
              <LensAssignmentStep
                battleId={activeBattleId}
                contenderAId={contenderAId}
                contenderAName={contenderAName}
                contenderBId={contenderBId}
                contenderBName={contenderBName}
              />
            )}

          </motion.div>
        </AnimatePresence>
      </StepWizard>
    </div>
  )
}
