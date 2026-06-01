import {
  Button,
  HelpButton,
  SegmentedControl,
  StepWizard,
  Tooltip,
} from '@lenserfight/ui/components'
import type { WizardStepConfig } from '@lenserfight/ui/components'
import { Input, TextArea } from '@lenserfight/ui/forms'
import {
  battlesService,
  battlesRepository,
  workflowsService,
  lensesService,
  battleExecutionRepository,
} from '@lenserfight/data/repositories'
import type { BattleTemplateRecord, WorkflowRecord } from '@lenserfight/data/repositories'
import { useAIProviders, useAIModelsByProvider } from '@lenserfight/features/generations'
import { useFundingSource, FundingSourceToggle, GenerateWithAIButton } from '@lenserfight/features/lenses'
import { useLenser } from '@lenserfight/features/profile'
import { useChainabitConnection } from '@lenserfight/features/store'
import { useWizardStep } from '@lenserfight/ui/routing'
import { normalizeError } from '@lenserfight/shared/error'
import { isValidUUID } from '@lenserfight/utils/validation'
import {
  formatSchedulePreview,
  localTimezone,
  minScheduleDateLocal,
  pastHoursForDate,
  pastMinutesForDateHour,
  serializeScheduleDateTime,
} from '@lenserfight/utils/date'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { GitBranch, HelpCircle, Info, Layers, Swords } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { BattleAutomationSettings } from './BattleAutomationSettings'
import { ChallengeGeneratorStep } from './ChallengeGeneratorStep'
import { ContenderInviteStep } from './ContenderInviteStep'
import { HandicapConfigPanel } from './HandicapConfigPanel'
import { LensAssignmentStep } from './LensAssignmentStep'
import { LenserBattlePolicyPanel } from './LenserBattlePolicyPanel'
import type { LenserSearchResult } from './LenserSearchPicker'
import { SharedParameterStep } from './SharedParameterStep'
import { WorkflowInputStep } from './WorkflowInputStep'
import { VoterEligibilitySelector } from './VoterEligibilitySelector'
import { TaskSourceSelector } from './TaskSourceSelector'
import { ContenderStructureSelector } from './ContenderStructureSelector'
import { ChallengeTypeSelector } from './ChallengeTypeSelector'
import { JudgingModeSelector } from './JudgingModeSelector'
import {
  type BattleFormat,
  getDefaultBattleTypeForFormat,
  isBattleTypeAllowedForFormat,
  isCompatibleCombination,
} from './battleCompatibility'
import {
  DEFAULT_LENSER_BATTLE_POLICY,
  type TaskSource,
  type ContenderStructure,
  type JudgingMode,
  type GeneratedChallengeStatus,
  isContenderAllowedForTaskSource,
  getRecommendedContender,
  isJudgingAllowedForContender,
  getRecommendedJudging,
  resolveToLegacyBattleType,
  challengeTypeRequiresGenerator,
} from '@lenserfight/domain/battle-governance'
import type { LenserBattlePolicy } from '@lenserfight/domain/battle-governance'

import type { AIHandicapConfig, BattleType, VoterEligibility } from '../../types/battle.types'
import { deriveBattleType } from '../../util/battle-type-codec'
import type { AICreationOutput } from '@lenserfight/infra/ai-creation'
import type { LensViewModel } from '@lenserfight/types'
import { useInviteContender } from '../../hooks/mutations/useInviteContender'

// ─── Step config ─────────────────────────────────────────────────────────────

const CONFIG_HELP_CONTENT = (
  <div className="space-y-3 p-1 text-left leading-relaxed">
    <div>
      <strong className="text-primary-yellow-600 dark:text-primary-yellow-400">
        Voter eligibility
      </strong>
      <p className="mt-0.5 text-greyscale-600 dark:text-greyscale-300">
        Controls who can vote on the battle outcome.
      </p>
    </div>
    <div>
      <strong className="text-primary-yellow-600 dark:text-primary-yellow-400">AI handicap</strong>
      <p className="mt-0.5 text-greyscale-600 dark:text-greyscale-300">
        Limits model speed or context to level the playing field.
      </p>
    </div>
    <div>
      <strong className="text-primary-yellow-600 dark:text-primary-yellow-400">
        AI execution (battle owner pays)
      </strong>
      <p className="mt-0.5 text-greyscale-600 dark:text-greyscale-300">
        Sets which model and funding source runs AI contenders. The battle creator pays — invited AI
        lensers do not spend personal credits.
      </p>
    </div>
  </div>
)

const stepAction = (path: string, label: string) => <HelpButton path={path} label={label} />

const BASE_WIZARD_STEPS: WizardStepConfig[] = [
  {
    label: 'Task',
    title: 'Choose task source',
    description:
      'Select the foundation for your battle — a lens prompt, a workflow pipeline, or a human challenge.',
    action: stepAction('/tutorials/battle-walkthroughs/your-first-battle', 'Your first battle'),
  },
  {
    label: 'Source',
    title: 'Select your source',
    description: 'Choose which workflow or lens to use for this battle.',
    action: stepAction('/tutorials/walkthroughs/create-a-workflow', 'Workflows'),
  },
  {
    label: 'Inputs',
    title: 'Shared inputs',
    description:
      'Set fair input values that every contender receives. Ensures an apples-to-apples comparison.',
    action: stepAction('/tutorials/battle-walkthroughs/lens-battle-params', 'Lens parameters'),
  },
  {
    label: 'Basics',
    title: 'Battle basics',
    description: 'Give your battle a title and description.',
    action: stepAction('/how-to/battles/create-a-battle', 'Create a battle'),
  },
  {
    label: 'Contenders',
    title: 'Who competes?',
    description: 'Choose the contender structure — AI vs AI, Human vs AI, or Human vs Human.',
    action: stepAction('/how-to/battles/battle-types', 'Battle types'),
  },
  {
    label: 'Challenge',
    title: 'Choose your challenge',
    description: 'Pick a game type for human contestants — writing, math, grammar, and more.',
    action: stepAction('/tutorials/battle-walkthroughs/challenge-battle', 'Challenge types'),
  },
  {
    label: 'Judging',
    title: 'How is the winner decided?',
    description:
      'Choose the judging method — community vote, AI judge, rubric, or automatic scoring.',
    action: stepAction('/how-to/battles/voting', 'Judging modes'),
  },
  {
    label: 'Config',
    title: 'Battle configuration',
    description:
      'Set voter eligibility, AI handicap, and the model that runs AI contenders. The battle creator configures and pays for AI execution.',
    action: (
      <div className="flex items-center gap-1.5">
        <Tooltip
          content={CONFIG_HELP_CONTENT}
          position="bottom"
          contentClassName="whitespace-normal w-72 p-3 !text-[11px]"
        >
          <button
            type="button"
            aria-label="Battle configuration help"
            className="flex items-center justify-center rounded-lg p-1.5 text-greyscale-400 hover:text-greyscale-600 hover:bg-greyscale-100 dark:hover:text-greyscale-300 dark:hover:bg-greyscale-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50"
          >
            <HelpCircle size={16} />
          </button>
        </Tooltip>
        {stepAction('/tutorials/battle-walkthroughs/byok-cloud-battle', 'Execution context')}
      </div>
    ),
  },
  {
    label: 'Schedule',
    title: 'Schedule execution',
    description: 'Set when AI contenders execute automatically. Optional — skip to run manually.',
    action: stepAction('/tutorials/agent-walkthroughs/cron-scheduling', 'Scheduling'),
  },
  {
    label: 'Invite',
    title: 'Invite contenders',
    description:
      'Add up to two contenders by their lenser handle or display name. In AI vs AI battles, invited AI lensers compete as named identities — they run under your execution config and do not spend personal credits.',
    action: stepAction('/how-to/battles/join-and-submit', 'Joining a battle'),
  },
  {
    label: 'Lenses',
    title: 'Contender lenses',
    description:
      'Optionally give each contender their own lens — a personal style or approach layered on top of the shared task. Not needed when both sides share the same task lens.',
    action: stepAction('/tutorials/walkthroughs/create-a-lens', 'About lenses'),
  },
  {
    label: 'Finish',
    title: 'Battle automation',
    description: 'Configure auto-assign contenders and auto-promote rules.',
    action: stepAction('/tutorials/battle-walkthroughs/battle-launch-guide', 'Battle automation'),
  },
]

const DEFAULT_HANDICAP: AIHandicapConfig = {
  injected_delay_ms: 2000,
  time_budget_ms: 300000,
  max_context_tokens: null,
  max_tokens_per_second: null,
  allowed_model_tier: null,
}

const AI_BATTLE_TYPES: BattleType[] = [
  'ai_vs_ai',
  'human_vs_ai',
  'human_vs_human_ai_votes',
  'lenser_battle',
]
const AUTO_EXEC_TYPES: BattleType[] = ['ai_vs_ai', 'workflow_battle']

// URLSearchParams.set coerces non-strings via String(), so writing `undefined`
// produces the literal "undefined" — which then reads back as a truthy value
// and corrupts every downstream check. Treat those sentinels as missing.
const readSearchParam = (params: URLSearchParams, key: string): string | null => {
  const value = params.get(key)
  if (!value || value === 'undefined' || value === 'null') return null
  return value
}

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 32 : -32 }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
  },
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
  const { lenser } = useLenser()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { step, goToStep } = useWizardStep({ maxStep: BASE_WIZARD_STEPS.length - 1 })

  const [direction, setDirection] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Step 0 — task source (V2: replaces old battleFormat)
  const [taskSource, setTaskSource] = useState<TaskSource | null>(() =>
    readSearchParam(searchParams, 'workflow_id') ? 'workflow' : null
  )
  // Legacy alias — derived from taskSource for backward compat with unchanged sub-components
  const battleFormat: BattleFormat | null =
    taskSource === 'challenge' ? null : (taskSource as BattleFormat | null)
  const setBattleFormat = (f: BattleFormat | 'workflow' | 'lens' | 'lenser_battle' | null) => {
    if (f === 'lenser_battle') {
      setTaskSource('lens')
      return
    }
    setTaskSource(f as TaskSource | null)
  }

  // Step 1 — source selection (lazy-init from URL)
  const [workflowScope, setWorkflowScope] = useState<'mine' | 'popular'>('mine')
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(() =>
    readSearchParam(searchParams, 'workflow_id')
  )
  const [selectedWorkflowTitle, setSelectedWorkflowTitle] = useState('')
  const [selectedLensId, setSelectedLensId] = useState<string | null>(null)
  const [selectedLensTitle, setSelectedLensTitle] = useState('')

  // Step 2 — shared parameter values (Lens Battle only)
  const [sharedParamValues, setSharedParamValues] = useState<Record<string, unknown>>({})
  // Step 2 — validity gate: false when required params exist but are unfilled
  const [inputsStepValidity, setInputsStepValidity] = useState(true)

  // Lenser Battle policy
  const [lenserBattlePolicy, setLenserBattlePolicy] = useState<LenserBattlePolicy>(
    DEFAULT_LENSER_BATTLE_POLICY
  )

  // Steps 3–5 — battle config
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  // Default executor: AI vs AI reinforces LenserFight's AI-arena positioning.
  // Auto-corrected via useEffect below if it becomes incompatible with the
  // selected format (e.g. on Lenser Battle).
  const [battleType, setBattleType] = useState<BattleType>('ai_vs_ai')
  // V2 contender structure + judging mode (replaces battleType for the wizard UI)
  const [contenderStructure, setContenderStructure] = useState<ContenderStructure>('ai_vs_ai')
  const [judgingMode, setJudgingMode] = useState<JudgingMode>('community_vote')
  const [challengeType, setChallengeType] = useState<string | null>(null)
  // Challenge generator state
  const [generatorLensId, setGeneratorLensId] = useState<string | null>(null)
  const [generatorModelId, setGeneratorModelId] = useState<string | null>(null)
  const [generatorDifficulty, setGeneratorDifficulty] = useState('medium')
  const [generatorLanguage, setGeneratorLanguage] = useState('en')
  const [generationStatus, setGenerationStatus] = useState<GeneratedChallengeStatus | null>(null)
  // Unified question text: typed directly OR filled from AI generation
  const [questionText, setQuestionText] = useState('')
  const [challengeLocked, setChallengeLocked] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [voterEligibility, setVoterEligibility] = useState<VoterEligibility>('open')
  const [handicap, setHandicap] = useState<AIHandicapConfig>(DEFAULT_HANDICAP)

  // Execution context (funding source + model selection for AI battles)
  const [selectedProviderKey, setSelectedProviderKey] = useState('')
  const [selectedModelKey, setSelectedModelKey] = useState('')
  const { data: battleProviders = [], isLoading: isLoadingProviders } = useAIProviders()
  const { data: battleProviderModels = [], isLoading: isLoadingModels } = useAIModelsByProvider(
    selectedProviderKey || null
  )
  const battleFunding = useFundingSource(selectedProviderKey)
  const chainabit = useChainabitConnection()

  // Mirror LensDetailPage: when a BYOK key is selected, sync its provider into
  // selectedProviderKey so the models query fires and the picker populates.
  useEffect(() => {
    if (battleFunding.fundingSource !== 'user_byok_cloud') return
    const key = battleFunding.availableKeys.find((k) => k.id === battleFunding.selectedKeyRefId)
    if (key && key.providerKey !== selectedProviderKey) {
      setSelectedProviderKey(key.providerKey)
      setSelectedModelKey('')
    }
  }, [battleFunding.fundingSource, battleFunding.selectedKeyRefId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (battleFunding.fundingSource !== 'user_byok_local') return
    const localKey = battleFunding.localKeys.find((k) => k.id === battleFunding.selectedLocalKeyId)
    if (localKey && localKey.provider !== 'ollama' && localKey.provider !== selectedProviderKey) {
      setSelectedProviderKey(localKey.provider)
      setSelectedModelKey('')
    }
  }, [battleFunding.fundingSource, battleFunding.selectedLocalKeyId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Format → Type compatibility enforcement (V1 legacy). When Format changes
  // and the current Type is no longer in the matrix, snap to the format's
  // recommended default.
  useEffect(() => {
    if (!battleFormat) return
    if (isBattleTypeAllowedForFormat(battleFormat, battleType)) return
    const recommended = getDefaultBattleTypeForFormat(battleFormat)
    setBattleType(recommended)
  }, [battleFormat]) // eslint-disable-line react-hooks/exhaustive-deps

  // V2: Task Source → Contender Structure compatibility enforcement
  useEffect(() => {
    if (!taskSource) return
    if (isContenderAllowedForTaskSource(taskSource, contenderStructure)) return
    const recommended = getRecommendedContender(taskSource)
    if (recommended) setContenderStructure(recommended)
  }, [taskSource]) // eslint-disable-line react-hooks/exhaustive-deps

  // V2: Contender Structure → Judging Mode compatibility enforcement
  useEffect(() => {
    if (!isJudgingAllowedForContender(contenderStructure, judgingMode)) {
      const recommended = getRecommendedJudging(contenderStructure)
      if (recommended) setJudgingMode(recommended)
    }
  }, [contenderStructure]) // eslint-disable-line react-hooks/exhaustive-deps

  // V2: Sync legacy battleType from V2 state for backward compat
  useEffect(() => {
    if (!taskSource) return
    const legacyType = resolveToLegacyBattleType({
      taskSource,
      contenderStructure,
      judgingMode,
      lenserPolicy:
        lenserBattlePolicy.memory_mode !== DEFAULT_LENSER_BATTLE_POLICY.memory_mode
          ? lenserBattlePolicy
          : undefined,
    })
    setBattleType(legacyType)
  }, [taskSource, contenderStructure, judgingMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Step 8 — scheduling (optional, only for ai_vs_ai / workflow_battle)
  // Date and time are kept as separate fields so the user sees their local
  // timezone explicitly and we can disable already-passed hours/minutes
  // dynamically without relying on browser datetime-local behaviour.
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('') // YYYY-MM-DD local
  const [scheduleHour, setScheduleHour] = useState<number | ''>('') // 0–23
  const [scheduleMinute, setScheduleMinute] = useState<number | ''>('') // 0–59

  // Derived: serialized ISO UTC string (null when incomplete or past)
  const executionStartsAt =
    scheduleDate !== '' && scheduleHour !== '' && scheduleMinute !== ''
      ? serializeScheduleDateTime(scheduleDate, scheduleHour as number, scheduleMinute as number)
      : null

  const [votingDurationHours, setVotingDurationHours] = useState(24)
  const [autoPublish, setAutoPublish] = useState(true)

  // Post-creation — slug is persisted in URL so it survives page refresh
  const [createdBattleSlug, setCreatedBattleSlug] = useState<string | null>(() =>
    readSearchParam(searchParams, 'battleSlug')
  )
  const [createdBattleId, setCreatedBattleId] = useState<string | null>(null)
  const [contenderAId, setContenderAId] = useState<string | undefined>()
  const [contenderAName, setContenderAName] = useState<string | undefined>()
  const [contenderBId, setContenderBId] = useState<string | undefined>()
  const [contenderBName, setContenderBName] = useState<string | undefined>()

  // Step 5 — invite contenders
  const [slotA, setSlotA] = useState<LenserSearchResult | null>(null)
  const [slotB, setSlotB] = useState<LenserSearchResult | null>(null)

  // Step 8 — automation
  const [autoAssignContenders, setAutoAssignContenders] = useState(false)
  const [autoPromote, setAutoPromote] = useState(false)
  const [automationReady, setAutomationReady] = useState(true)

  const rawBattleIdParam = readSearchParam(searchParams, 'battleId')
  // Treat anything that isn't a real UUID as missing — protects every
  // downstream consumer (isEditMode, the edit-mode fetch effect, activeBattleId).
  const battleIdFromUrl = isValidUUID(rawBattleIdParam) ? rawBattleIdParam : null
  const preselectedWorkflowId = readSearchParam(searchParams, 'workflow_id')
  const preselectedTemplateId = readSearchParam(searchParams, 'template')

  const invite = useInviteContender(createdBattleId ?? '')

  // Reset inputs-step validity when the selected source changes so switching
  // lens/workflow does not leave the Next button permanently disabled.
  useEffect(() => {
    setInputsStepValidity(true)
  }, [selectedLensId, selectedWorkflowId])

  // Auto-advance to step 1 when arriving with ?workflow_id param
  useEffect(() => {
    if (preselectedWorkflowId && !battleIdFromUrl) {
      goToStep(1)
    }
  }, []) // eslint-disable-line

  // Phase AX — prefill from ?template=<id>: pull the template, hydrate fields
  // (title, prompt, voter_eligibility, battle_type, max_contenders) and jump
  // straight to step 1 so the user can keep customizing.
  useEffect(() => {
    if (!preselectedTemplateId || battleIdFromUrl) return
    let cancelled = false
    void (async () => {
      try {
        const all = await battlesRepository.listPublicBattleTemplates(undefined, 100)
        const tpl: BattleTemplateRecord | undefined = all.find(
          (t) => t.id === preselectedTemplateId
        )
        if (!tpl || cancelled) return
        if (!title) setTitle(tpl.title)
        if (!description) setDescription(tpl.task_prompt)
        if (!battleFormat) setBattleFormat('lens')
        goToStep(1)
      } catch (e) {
        console.error('Failed to prefill template', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [preselectedTemplateId]) // eslint-disable-line

  // ── Fetch existing battle for editing ─────────────────────────────────────
  const isEditMode = !!battleIdFromUrl && step < 9

  useEffect(() => {
    if (battleIdFromUrl && step < 8) {
      const fetchBattleData = async () => {
        try {
          const battle = await battlesService.getBattleById(battleIdFromUrl)
          if (battle && battle.status === 'draft') {
            setTitle(battle.title)
            setDescription(
              battle.task_prompt.startsWith('Workflow battle: ') ||
                battle.task_prompt.startsWith('Lens battle: ')
                ? ''
                : battle.task_prompt
            )
            const existingBattleType = deriveBattleType(battle)
            setBattleType(existingBattleType)
            setVoterEligibility(battle.voter_eligibility)
            if (battle.handicap_config) {
              setHandicap(battle.handicap_config as unknown as AIHandicapConfig)
            }
            if (existingBattleType === 'lenser_battle') {
              setTaskSource('lens') // V2: lenser_battle is now a policy overlay, default to lens
            } else if (battle.workflow_id) {
              setBattleFormat('workflow')
              setSelectedWorkflowId(battle.workflow_id)
            } else if (battle.lens_id) {
              setBattleFormat('lens')
              setSelectedLensId(battle.lens_id)
            }
            setCreatedBattleId(battle.id)
            setCreatedBattleSlug(battle.slug)
            // Skip format/source/type steps if we already have them
            if (
              step === 0 &&
              (battle.workflow_id || battle.lens_id || existingBattleType === 'lenser_battle')
            ) {
              goToStep(3)
            }
          }
        } catch (e) {
          console.error('Failed to fetch battle for editing', e)
        }
      }
      fetchBattleData()
    }
  }, [battleIdFromUrl]) // eslint-disable-line

  // Guard: if URL claims step >= 6 but there's no (valid) battleId, reset to
  // step 0. Also strips literal "undefined" / "null" leftovers from the URL so
  // the user lands in a clean state.
  useEffect(() => {
    const battleIdRaw = searchParams.get('battleId')
    const slugRaw = searchParams.get('battleSlug')
    const hasBogusBattleId = battleIdRaw !== null && !isValidUUID(battleIdRaw)
    const hasBogusSlug = slugRaw === 'undefined' || slugRaw === 'null'

    if (step >= 9 && !battleIdFromUrl) {
      navigate('/battles/create', { replace: true })
      return
    }

    if (hasBogusBattleId || hasBogusSlug) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (hasBogusBattleId) next.delete('battleId')
          if (hasBogusSlug) next.delete('battleSlug')
          return next
        },
        { replace: true }
      )
    }
  }, [step, battleIdFromUrl, searchParams, navigate, setSearchParams])

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
    enabled: !!lenser?.id && taskSource === 'workflow' && step === 1 && workflowScope === 'mine',
    staleTime: 1000 * 60,
  })
  const workflows = (myWorkflowsData?.data ?? []) as WorkflowRecord[]

  const { data: popularWorkflowsData, isLoading: loadingPopularWorkflows } = useQuery({
    queryKey: ['battle-wizard-popular-workflows'],
    queryFn: () => workflowsService.getPopular(0, 30),
    enabled: taskSource === 'workflow' && step === 1 && workflowScope === 'popular',
    staleTime: 1000 * 60,
  })
  const popularWorkflows = (popularWorkflowsData?.data ?? []) as WorkflowRecord[]

  const { data: lensesData, isLoading: loadingLenses } = useQuery({
    queryKey: ['battle-wizard-lenses', lenser?.id],
    queryFn: () => lensesService.getPersonalFeed(lenser?.id ?? '', 0, 30),
    enabled: !!lenser?.id && taskSource === 'lens' && step === 1,
    staleTime: 1000 * 60,
  })
  const myLenses: LensViewModel[] = (lensesData?.data ?? []) as LensViewModel[]

  // ── AI generation (delegated to the shared GenerateWithAIButton) ───────────
  const battleAiContext = useMemo(
    () => ({
      availableLensIds: myLenses.map((l) => l.id),
      availableWorkflowIds: workflows.map((w) => w.id),
    }),
    [myLenses, workflows],
  )

  const handleBattleGenerated = useCallback((output: AICreationOutput) => {
    if (output.type !== 'battle') return
    const { title: genTitle, task_prompt } = output.result
    setTitle(genTitle)
    // The wizard's `description` field stores the battle task_prompt (see template load).
    setDescription(task_prompt)
    // Advisory suggestions — the wizard's compatibility effects coerce invalid combos.
    if (output.result.suggestedTaskSource) setTaskSource(output.result.suggestedTaskSource)
    if (output.result.suggestedContenderStructure)
      setContenderStructure(output.result.suggestedContenderStructure)
    if (output.result.suggestedJudgingMode) setJudgingMode(output.result.suggestedJudgingMode)
    if (output.result.suggestedChallengeType) setChallengeType(output.result.suggestedChallengeType)
  }, [])

  // ── Navigation ───────────────────────────────────────────────────────────

  // ── Validation ───────────────────────────────────────────────────────────

  const showsHandicap = contenderStructure === 'ai_vs_ai' || contenderStructure === 'human_vs_ai'

  // Skip steps that don't apply for the selected task source and contender structure:
  // New steps: 0=Task, 1=Source, 2=Inputs, 3=Basics, 4=Contenders, 5=Challenge,
  //            6=Judging, 7=Config, 8=Schedule, 9=Invite, 10=Lenses, 11=Finish
  //
  // - challenge task: skip Source (1) and Inputs (2)
  // - workflow task: skip Inputs (2) and Challenge (5)
  // - lens task: skip Challenge (5) unless human contenders
  // - ai_vs_ai contenders: skip Challenge (5), auto-skip Judging (6) if desired
  const go = (next: number) => {
    const isForward = next > step
    let target = next

    // ── Challenge: no Source (1) or Inputs (2) steps ───────────────────────
    if (taskSource === 'challenge') {
      if (next === 1) target = isForward ? 3 : 0
      if (next === 2) target = isForward ? 3 : 0
    } else if (taskSource === 'workflow') {
      // Workflow shows Inputs (2) via WorkflowInputStep — no longer skipped.
      // Challenge (5) is always skipped for workflow (no human challenge types).
      if (next === 5) target = isForward ? 6 : 4
    }
    // Lens: uses Inputs (2) as normal; Challenge (5) skip covered by ai_vs_ai check below.

    // ── Lens & Workflow: Contenders (4) is ai_vs_ai only — skip the step ───
    // contenderStructure is auto-locked to ai_vs_ai via the domain useEffect.
    if ((taskSource === 'lens' || taskSource === 'workflow') && target === 4) {
      target = isForward ? 5 : 3
    }

    // ── ai_vs_ai (covers all Lens/Workflow battles): skip Challenge (5) ─────
    if (target === 5 && contenderStructure === 'ai_vs_ai') {
      target = isForward ? 6 : 4
    }

    // ── Second pass: challenge-skip may re-land on 4 for lens/workflow ──────
    if ((taskSource === 'lens' || taskSource === 'workflow') && target === 4) {
      target = isForward ? 5 : 3
    }

    // ── Challenge task: skip Contender Lenses (10) — no lens-based execution ─
    if (taskSource === 'challenge' && target === 10) {
      target = isForward ? 11 : 9
    }

    setDirection(isForward ? 1 : -1)
    goToStep(target)
  }

  // Computed up-front so canProceed / stepValidity (which run on every render)
  // can read it without tripping the TDZ on `activeBattleId` further below.
  const computedActiveBattleId = isValidUUID(createdBattleId)
    ? createdBattleId
    : isValidUUID(battleIdFromUrl)
      ? battleIdFromUrl
      : null

  // Step 7 (Config) needs an execution context when AI contenders are managed
  // by the platform. Challenge tasks with human-only contenders don't need it.
  const aiExecutionRequired =
    contenderStructure === 'ai_vs_ai' || contenderStructure === 'human_vs_ai'
  const aiExecutionValid = !aiExecutionRequired || (!!selectedProviderKey && !!selectedModelKey)

  // Output modality required by the selected lens (from its declared output_contract.kind).
  // Used to filter the model list in Step 7 and for pre-flight validation at creation.
  const requiredOutputModality: string | null =
    taskSource === 'lens'
      ? (myLenses.find((l) => l.id === selectedLensId)?.outputKind ?? null)
      : null

  // Filter models to those that support the required output modality.
  // If a model has no declared output_modalities (legacy), it's included (safe default).
  const filteredProviderModels = requiredOutputModality
    ? battleProviderModels.filter(
        (m) => !m.outputModalities?.length || m.outputModalities.includes(requiredOutputModality)
      )
    : battleProviderModels

  const sourceValid =
    taskSource === 'challenge'
      ? true
      : taskSource === 'workflow'
        ? !!selectedWorkflowId
        : !!selectedLensId

  const inputsStepValid = inputsStepValidity

  // Challenge type is required when task source is challenge.
  // Question text is the source of truth — typed directly or filled from AI generation.
  // AI-generated questions that were locked also satisfy the requirement.
  const challengeNeedsGenerator = !!challengeType && challengeTypeRequiresGenerator(challengeType)
  const challengeStepValid =
    taskSource !== 'challenge' || (!!challengeType && (!!questionText.trim() || challengeLocked))

  const canProceed = (() => {
    if (step === 0) return taskSource !== null
    if (step === 1) return sourceValid
    if (step === 2) return inputsStepValid
    if (step === 3) return title.trim().length >= 3
    if (step === 4) return true // contender structure — always valid once selected
    if (step === 5) return challengeStepValid
    if (step === 6) return true // judging mode — always valid once selected
    if (step === 7) return aiExecutionValid
    // Step 11 (automation/finish) requires the battle to exist
    if (step === 11) return automationReady && !!computedActiveBattleId
    // Steps 8–10 are always skippable / valid
    return true
  })()

  const stepValidity: boolean[] = [
    taskSource !== null, // 0: Task Source
    sourceValid, // 1: Source
    inputsStepValid, // 2: Inputs (lens only)
    title.trim().length >= 3, // 3: Basics
    true, // 4: Contenders — always valid
    challengeStepValid, // 5: Challenge Type
    true, // 6: Judging — always valid
    aiExecutionValid, // 7: Config
    true, // 8: Schedule — always skippable
    true, // 9: Invite — always skippable
    true, // 10: Lenses — always skippable
    automationReady && !!computedActiveBattleId, // 11: Finish/Automation
  ]

  // ── Create battle (step 5 → 6) ───────────────────────────────────────────

  const handleCreateBattle = async () => {
    if (!canProceed) return

    // Pre-flight: verify selected model can produce the output required by the lens.
    // This blocks creation before any DB write — backend constraint backs this up.
    if (requiredOutputModality && selectedModelKey) {
      const selectedModel = battleProviderModels.find((m) => m.key === selectedModelKey)
      if (
        selectedModel?.outputModalities?.length &&
        !selectedModel.outputModalities.includes(requiredOutputModality)
      ) {
        setError(
          `The selected model does not support "${requiredOutputModality}" output, which is required by the chosen lens. Select a compatible model in the Config step.`
        )
        return
      }
    }

    setSubmitting(true)
    setError(null)
    try {
      // V2: Resolve the legacy battle_type from the new 3-axis model
      const resolvedBattleType: BattleType = taskSource
        ? resolveToLegacyBattleType({
            taskSource,
            contenderStructure,
            judgingMode,
            lenserPolicy:
              lenserBattlePolicy.memory_mode !== DEFAULT_LENSER_BATTLE_POLICY.memory_mode
                ? lenserBattlePolicy
                : undefined,
          })
        : battleType

      // Final compatibility gate — if the legacy format is available, validate.
      if (
        battleFormat &&
        !isCompatibleCombination(battleFormat as BattleFormat | null, resolvedBattleType)
      ) {
        // For V2 model this is a soft warning since the mapper handles the mapping
        console.debug(
          `Legacy compatibility note: "${resolvedBattleType}" mapped from V2 model ` +
            `(${taskSource}/${contenderStructure}/${judgingMode}) for format "${battleFormat}".`
        )
      }

      const resolvedPrompt =
        description.trim() ||
        (taskSource === 'workflow'
          ? `Workflow battle: ${selectedWorkflowTitle || selectedWorkflowId}`
          : taskSource === 'challenge'
            ? `Challenge battle: ${challengeType || 'unspecified'}`
            : `Lens battle: ${selectedLensTitle || selectedLensId}`)

      const battleInput = {
        title: title.trim(),
        task_prompt: resolvedPrompt,
        battle_type: resolvedBattleType,
        voter_eligibility: voterEligibility,
        handicap: AI_BATTLE_TYPES.includes(resolvedBattleType) ? handicap : undefined,
        ...(taskSource === 'workflow' && selectedWorkflowId
          ? { workflow_id: selectedWorkflowId }
          : {}),
        ...(taskSource === 'lens' && selectedLensId ? { lens_id: selectedLensId } : {}),
        // Store shared Lens parameter values for fairness
        ...(taskSource === 'lens' && Object.keys(sharedParamValues).length > 0
          ? { shared_input_snapshot: sharedParamValues }
          : {}),
        // Store Lenser Battle memory/instruction policy when configured
        ...(lenserBattlePolicy.memory_mode !== DEFAULT_LENSER_BATTLE_POLICY.memory_mode
          ? { lenser_battle_policy: lenserBattlePolicy as unknown as Record<string, unknown> }
          : {}),
        // V2 fields
        ...(taskSource ? { task_source: taskSource } : {}),
        contender_structure: contenderStructure,
        judging_mode: judgingMode,
        ...(challengeType ? { challenge_type: challengeType } : {}),
        ...(autoAssignContenders || autoPromote
          ? { automation_config: { autoAssignContenders, autoPromote } }
          : {}),
      }

      let battle
      if (isEditMode && createdBattleId) {
        battle = await battlesService.updateBattle(createdBattleId, battleInput)
      } else {
        battle = await battlesService.createBattle(battleInput)
      }

      // The service contract guarantees id + slug on success, but defend the
      // URL anyway — writing `undefined` here propagates as the literal string
      // "undefined" and breaks every downstream step (isEditMode, lens assignment,
      // automation, the parent's success navigation).
      if (!battle?.id || !isValidUUID(battle.id) || !battle?.slug) {
        throw new Error('Battle creation succeeded but the response is missing id or slug.')
      }

      // Persist execution config for AI battles
      if (resolvedBattleType === 'ai_vs_ai' && selectedProviderKey && selectedModelKey) {
        await battleExecutionRepository.upsertExecutionConfig({
          battle_id: battle.id,
          contender_id: null,
          provider_key: selectedProviderKey,
          model_key: selectedModelKey,
          funding_source: battleFunding.fundingSource as
            | 'user_byok_cloud'
            | 'user_byok_local'
            | 'platform_credit'
            | 'sponsored',
          byok_key_ref_id: battleFunding.selectedKeyRefId || undefined,
          max_tokens: 4096,
          temperature: 0.7,
        })
      }

      // Persist and lock generated challenge for challenge battles (only when AI generation was used)
      if (
        taskSource === 'challenge' &&
        challengeLocked &&
        questionText.trim() &&
        generatorLensId &&
        generatorModelId
      ) {
        try {
          const { challengeGenerationService } = await import('@lenserfight/data/repositories')
          const result = await challengeGenerationService.generate({
            battleId: battle.id,
            config: {
              generatorLensId,
              generatorModelId,
              challengeType: challengeType!,
              difficulty: generatorDifficulty as 'easy' | 'medium' | 'hard' | 'expert',
              language: generatorLanguage,
            },
            createdBy: lenser?.id ?? '',
          })
          if (result.status === 'ready') {
            await challengeGenerationService.lockChallenge(result.challengeId, battle.id)
          }
        } catch (err) {
          // Non-blocking — challenge can be linked later
          console.warn('Failed to persist generated challenge:', err)
        }
      }

      setCreatedBattleSlug(battle.slug)
      setCreatedBattleId(battle.id)
      setDirection(1)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('step', '8')
          next.set('battleId', battle.id)
          next.set('battleSlug', battle.slug)
          return next
        },
        { replace: false }
      )
    } catch (e) {
      setError(normalizeError(e).message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Invite contenders (step 7 → 8) ───────────────────────────────────────

  const activeBattleId = computedActiveBattleId

  const handleInvite = async () => {
    if (!activeBattleId) {
      // No battle to attach contenders to — surface the cause rather than
      // silently skipping ahead, which previously looked like a successful
      // invite to the user.
      setInviteError(
        'Cannot invite contenders: battle has not been created yet. Go back and complete the configuration step.'
      )
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
        const isDirectA = (slotA as typeof slotA & { directInvite?: boolean }).directInvite === true
        if (!isDirectA && existingA && existingA.contender_ref_id === slotA.id) {
          // Already invited — use existing record, skip insert
          setContenderAId(existingA.id)
          setContenderAName(existingA.display_name)
        } else {
          if (existingA) {
            // Different lenser selected — remove stale record first
            await battlesService.removeContender(existingA.id)
          }
          const result = await invite.mutateAsync({
            battle_id: activeBattleId,
            slot: 'A',
            contender_type: slotA.type === 'ai' ? 'ai_agent' : 'human',
            ...(isDirectA
              ? { handle: slotA.handle }
              : { contender_ref_id: slotA.id, display_name: slotA.display_name }),
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
        const isDirectB = (slotB as typeof slotB & { directInvite?: boolean }).directInvite === true
        if (!isDirectB && existingB && existingB.contender_ref_id === slotB.id) {
          setContenderBId(existingB.id)
          setContenderBName(existingB.display_name)
        } else {
          if (existingB) {
            await battlesService.removeContender(existingB.id)
          }
          const result = await invite.mutateAsync({
            battle_id: activeBattleId,
            slot: 'B',
            contender_type: slotB.type === 'ai' ? 'ai_agent' : 'human',
            ...(isDirectB
              ? { handle: slotB.handle }
              : { contender_ref_id: slotB.id, display_name: slotB.display_name }),
          })
          setContenderBId(result.id)
          setContenderBName(result.display_name)
        }
      } else if (existingB) {
        await battlesService.removeContender(existingB.id)
        setContenderBId(undefined)
        setContenderBName(undefined)
      }

      go(10)
    } catch (e) {
      const msg = (e as any)?.message ?? ''
      if (msg.includes('contenders_battle_ref_unique') || msg.includes('duplicate key')) {
        setInviteError('This lenser has already been invited to this battle.')
      } else if (msg.includes('lenser_type_mismatch')) {
        const detail = msg.replace('lenser_type_mismatch: ', '')
        setInviteError(detail || 'This lenser type does not match the battle mode.')
      } else if (msg.includes('lenser_not_found')) {
        setInviteError('Lenser not found. Check the handle and try again.')
      } else {
        setInviteError('Failed to invite contender. Please try again.')
      }
    } finally {
      setInviting(false)
    }
  }

  // ── Schedule submission (step 6 → 7) ─────────────────────────────────────

  const handleScheduleAndNext = async () => {
    if (scheduleEnabled && AUTO_EXEC_TYPES.includes(battleType)) {
      // Guard: reject incomplete or past schedule before any network call
      if (!executionStartsAt) {
        setError(
          scheduleDate && (scheduleHour !== '' || scheduleMinute !== '')
            ? 'The selected date and time is in the past. Please choose a future time.'
            : 'Please select a date and time for execution.'
        )
        return
      }
      if (!activeBattleId) {
        setError('Cannot schedule: battle has not been created yet.')
        return
      }
      setSubmitting(true)
      setError(null)
      try {
        await battlesService.scheduleBattle({
          battle_id: activeBattleId,
          execution_starts_at: executionStartsAt,
          voting_duration_hours: votingDurationHours,
          auto_publish: autoPublish,
        })
      } catch (e) {
        setError(normalizeError(e).message)
        setSubmitting(false)
        return
      } finally {
        setSubmitting(false)
      }
    }
    go(9)
  }

  const handleFinish = () => {
    if (!createdBattleSlug) {
      setError('Cannot finish: battle slug is missing. Please re-create the battle.')
      return
    }
    onSuccess(createdBattleSlug)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // Skip button config per step
  const skipButton =
    step === 8
      ? { label: 'Skip for now', onClick: () => go(9) }
      : step === 9
        ? { label: 'Skip for now', onClick: () => go(10) }
        : step === 10
          ? { label: 'Skip for now', onClick: () => go(11) }
          : step === 11
            ? { label: 'Skip for now', onClick: handleFinish }
            : undefined

  // Next / complete handler varies by step
  const handleNext =
    step === 7
      ? handleCreateBattle
      : step === 8
        ? handleScheduleAndNext
        : step === 9
          ? handleInvite
          : () => go(step + 1)

  const handleComplete = handleFinish

  // Wizard steps are used as-is — titles/descriptions are already set
  // in BASE_WIZARD_STEPS for the new 12-step sequence.
  const wizardSteps = useMemo<WizardStepConfig[]>(() => {
    return BASE_WIZARD_STEPS
  }, [])

  return (
    <div className="w-full">
      <StepWizard
        steps={wizardSteps}
        currentStep={step}
        onNext={handleNext}
        onBack={() => go(step - 1)}
        onComplete={handleComplete}
        onCancel={onClose}
        canProceed={canProceed}
        isCompleting={step === 7 || step === 8 ? submitting : step === 9 ? inviting : false}
        isNextLoading={step === 7 || step === 8 ? submitting : step === 9 ? inviting : false}
        completeLabel="Go to Battle"
        completeIcon={<Swords size={15} className="mr-1.5" />}
        nextLabel={
          step === 7
            ? isEditMode
              ? 'Update Battle'
              : 'Create Battle'
            : step === 9
              ? 'Invite'
              : 'Next'
        }
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
            {/* ── Step 0: Task Source chooser ─────────────────────────── */}
            {step === 0 && <TaskSourceSelector value={taskSource} onChange={setTaskSource} />}

            {/* ── Step 1: Workflow picker ───────────────────────────── */}
            {step === 1 &&
              taskSource === 'workflow' &&
              (() => {
                const isLoading =
                  workflowScope === 'mine' ? loadingWorkflows : loadingPopularWorkflows
                const list =
                  workflowScope === 'mine' ? (workflows as WorkflowRecord[]) : popularWorkflows
                return (
                  <div className="space-y-3">
                    <SegmentedControl
                      options={[
                        { value: 'mine', label: 'My Workflows' },
                        { value: 'popular', label: 'Popular' },
                      ]}
                      value={workflowScope}
                      onChange={(v) => {
                        setWorkflowScope(v as 'mine' | 'popular')
                        setSelectedWorkflowId(null)
                      }}
                      size="sm"
                    />
                    <div className="space-y-2">
                      {isLoading &&
                        Array.from({ length: 4 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-14 rounded-2xl bg-surface-raised animate-pulse"
                          />
                        ))}
                      {!isLoading && list.length === 0 && (
                        <p className="py-8 text-center text-sm text-greyscale-400">
                          {workflowScope === 'mine'
                            ? 'No workflows found. Create one first from the Workflows section.'
                            : 'No popular workflows yet. Check back later.'}
                        </p>
                      )}
                      {!isLoading &&
                        list.map((wf) => (
                          <Button
                            key={wf.id}
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setSelectedWorkflowId(wf.id)
                              setSelectedWorkflowTitle(wf.title)
                            }}
                            className={`!justify-start !gap-3 !rounded-2xl !border-2 !px-4 !py-3 w-full !font-normal text-left !transition-colors ${
                              selectedWorkflowId === wf.id
                                ? '!border-primary-yellow-500 !bg-primary-yellow-500/5 hover:!bg-primary-yellow-500/5'
                                : '!border-surface-border hover:!border-greyscale-300 dark:hover:!border-greyscale-600 !bg-transparent hover:!bg-transparent'
                            }`}
                          >
                            <GitBranch
                              size={16}
                              className={
                                selectedWorkflowId === wf.id
                                  ? 'text-primary-yellow-600 flex-shrink-0'
                                  : 'text-greyscale-400 flex-shrink-0'
                              }
                            />
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                                {wf.title}
                              </p>
                              {wf.description && (
                                <p className="truncate text-xs text-greyscale-400">
                                  {wf.description}
                                </p>
                              )}
                            </div>
                          </Button>
                        ))}
                    </div>
                  </div>
                )
              })()}

            {/* ── Step 1: Lens picker ───────────────────────────────── */}
            {step === 1 && taskSource === 'lens' && (
              <div className="space-y-2">
                {loadingLenses &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-2xl bg-surface-raised animate-pulse" />
                  ))}
                {!loadingLenses && myLenses.length === 0 && (
                  <p className="py-8 text-center text-sm text-greyscale-400">
                    No lenses found. Create a lens first.
                  </p>
                )}
                {!loadingLenses &&
                  myLenses.map((lens) => (
                    <Button
                      key={lens.id}
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setSelectedLensId(lens.id)
                        setSelectedLensTitle(lens.title)
                      }}
                      className={`!justify-start !gap-3 !rounded-2xl !border-2 !px-4 !py-3 w-full !font-normal text-left !transition-colors ${
                        selectedLensId === lens.id
                          ? '!border-primary-yellow-500 !bg-primary-yellow-500/5 hover:!bg-primary-yellow-500/5'
                          : '!border-surface-border hover:!border-greyscale-300 dark:hover:!border-greyscale-600 !bg-transparent hover:!bg-transparent'
                      }`}
                    >
                      <Layers
                        size={16}
                        className={
                          selectedLensId === lens.id
                            ? 'text-primary-yellow-600 flex-shrink-0'
                            : 'text-greyscale-400 flex-shrink-0'
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                          {lens.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {lens.visibility !== 'public' && (
                            <span className="text-xs text-greyscale-400 capitalize">
                              {lens.visibility}
                            </span>
                          )}
                          {lens.outputKind && (
                            <span className="rounded border border-surface-border bg-surface-base px-1.5 py-0.5 font-mono text-[10px] capitalize text-greyscale-500 dark:text-greyscale-400">
                              {lens.outputKind}
                            </span>
                          )}
                        </div>
                      </div>
                    </Button>
                  ))}
              </div>
            )}

            {/* ── Step 2: Shared inputs (Lens Task) ───────────────── */}
            {step === 2 && taskSource === 'lens' && (
              <SharedParameterStep
                lensId={selectedLensId}
                values={sharedParamValues}
                onChange={setSharedParamValues}
                lens={myLenses.find((l) => l.id === selectedLensId) ?? null}
                onValidityChange={setInputsStepValidity}
              />
            )}

            {/* ── Step 2: Trigger inputs (Workflow Task) ───────────── */}
            {step === 2 && taskSource === 'workflow' && (
              <WorkflowInputStep
                workflowId={selectedWorkflowId}
                values={sharedParamValues}
                onChange={setSharedParamValues}
                onValidityChange={setInputsStepValidity}
              />
            )}

            {/* ── Step 3: Battle basics ─────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label className="block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                      Battle title
                    </label>
                    {lenser?.id && (
                      <GenerateWithAIButton
                        profileId={lenser.id}
                        generationType="battle"
                        context={battleAiContext}
                        funding={battleFunding}
                        chainabit={chainabit}
                        onGenerated={handleBattleGenerated}
                      />
                    )}
                  </div>
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
                    onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                    placeholder="Add context for participants and voters, e.g. what success looks like."
                    minRows={4}
                    maxLength={1000}
                    autoResize={false}
                  />
                  <p className="mt-1 text-right text-xs text-greyscale-400">
                    {description.length}/1000
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 4: Contender Structure (V2) ──────────────────── */}
            {step === 4 && (
              <ContenderStructureSelector
                value={contenderStructure}
                onChange={(cs) => {
                  setContenderStructure(cs)
                  // Clear challenge type when switching to AI-only
                  if (cs === 'ai_vs_ai') setChallengeType(null)
                }}
                taskSource={taskSource}
                onChangeTaskSource={() => go(0)}
              />
            )}

            {/* ── Step 5: Challenge Type + Question (V2, human contenders only) ─── */}
            {step === 5 && (
              <div className="space-y-6">
                <ChallengeTypeSelector
                  value={challengeType}
                  onChange={(ct) => {
                    setChallengeType(ct)
                    // Reset question/generation state on challenge type change
                    setGenerationStatus(null)
                    setQuestionText('')
                    setChallengeLocked(false)
                    setGenerationError(null)
                  }}
                  contenderStructure={contenderStructure}
                />
                {/* Question input + optional AI generator (shown for all challenge types) */}
                {challengeType && (
                  <ChallengeGeneratorStep
                    challengeType={challengeType}
                    questionText={questionText}
                    onQuestionTextChange={setQuestionText}
                    generatorLensId={generatorLensId}
                    onGeneratorLensChange={setGeneratorLensId}
                    difficulty={generatorDifficulty}
                    onDifficultyChange={setGeneratorDifficulty}
                    language={generatorLanguage}
                    onLanguageChange={setGeneratorLanguage}
                    generationStatus={generationStatus}
                    onGenerationStatusChange={setGenerationStatus}
                    onLock={() => {
                      setChallengeLocked(true)
                      setGenerationStatus('locked')
                    }}
                    isLocked={challengeLocked}
                    generationError={generationError}
                    onGenerationErrorChange={setGenerationError}
                    availableLenses={myLenses.map((l) => ({
                      id: l.id,
                      title: l.title,
                      slug: l.id,
                    }))}
                    onGeneratorModelChange={setGeneratorModelId}
                  />
                )}
              </div>
            )}

            {/* ── Step 6: Judging Mode (V2) ────────────────────────── */}
            {step === 6 && (
              <JudgingModeSelector
                value={judgingMode}
                onChange={(mode) => {
                  setJudgingMode(mode)
                  // Sync voter eligibility for AI judge
                  if (mode === 'ai_judge') setVoterEligibility('ai_only')
                  else if (voterEligibility === 'ai_only') setVoterEligibility('open')
                }}
                contenderStructure={contenderStructure}
              />
            )}

            {/* ── Step 7: Configuration ─────────────────────────────── */}
            {step === 7 && (
              <div className="space-y-6">
                <div>
                  <div className="mb-4 flex items-center gap-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-greyscale-400">
                      Voter &amp; Performance Settings
                    </h4>
                    <Tooltip
                      content="Controls who can vote and whether an AI handicap applies to level the playing field."
                      position="right"
                      contentClassName="whitespace-normal w-56 text-[11px]"
                    >
                      <Info
                        size={13}
                        className="text-greyscale-400 hover:text-greyscale-600 cursor-default"
                      />
                    </Tooltip>
                  </div>
                  <div className="space-y-6">
                    <VoterEligibilitySelector
                      contenderStructure={contenderStructure}
                      judgingMode={judgingMode}
                      value={voterEligibility}
                      onChange={setVoterEligibility}
                    />
                    {showsHandicap && (
                      <HandicapConfigPanel value={handicap} onChange={setHandicap} />
                    )}
                  </div>
                </div>

                {/* Execution context — required for AI contenders */}
                {(contenderStructure === 'ai_vs_ai' || contenderStructure === 'human_vs_ai') && (
                  <div className="border-t border-surface-border pt-6">
                    <div className="mb-3 flex items-center gap-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-greyscale-400">
                        AI Execution
                      </h4>
                      <Tooltip
                        content="Sets which model and funding source runs AI contenders. The battle creator pays — invited AI lensers do not spend personal credits."
                        position="right"
                        contentClassName="whitespace-normal w-60 text-[11px]"
                      >
                        <Info
                          size={13}
                          className="text-greyscale-400 hover:text-greyscale-600 cursor-default"
                        />
                      </Tooltip>
                    </div>
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-xs text-greyscale-500 dark:text-greyscale-400">
                      <Info size={13} className="flex-shrink-0 text-primary-yellow-500" />
                      <span>
                        <strong className="text-greyscale-700 dark:text-greyscale-200">
                          Battle creator pays.
                        </strong>{' '}
                        AI contenders run under this config. Invited AI lensers act as named
                        identities — they do not spend personal credits.
                      </span>
                    </div>
                    {requiredOutputModality && (
                      <div className="mb-3 flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-xs text-greyscale-500 dark:text-greyscale-400">
                        <Info size={13} className="flex-shrink-0 text-primary-yellow-500" />
                        Showing models that support{' '}
                        <span className="font-semibold capitalize text-greyscale-900 dark:text-greyscale-50">
                          {requiredOutputModality}
                        </span>{' '}
                        output — required by the selected lens.
                      </div>
                    )}
                    <FundingSourceToggle
                      fundingSource={battleFunding.fundingSource}
                      onFundingSourceChange={battleFunding.setFundingSource}
                      selectedKeyRefId={battleFunding.selectedKeyRefId}
                      onKeyRefIdChange={battleFunding.setSelectedKeyRefId}
                      availableKeys={battleFunding.availableKeys}
                      selectedLocalKeyId={battleFunding.selectedLocalKeyId}
                      onLocalKeyIdChange={battleFunding.setSelectedLocalKeyId}
                      availableLocalKeys={battleFunding.localKeys}
                      localKeyAvailability={battleFunding.localKeyAvailability}
                      onAddLocalKey={battleFunding.addLocalKey}
                      onRemoveLocalKey={battleFunding.removeLocalKey}
                      onUpdateLocalKey={battleFunding.updateLocalKey}
                      onPairGateway={battleFunding.pairGateway}
                      onForgetGateway={battleFunding.forgetGateway}
                      onRefreshLocalKeys={battleFunding.refreshLocalKeys}
                      walletBalance={battleFunding.walletBalance}
                      canUseBYOK={battleFunding.canUseBYOK}
                      chainabitState={chainabit.state}
                      chainabitModels={chainabit.models}
                      onChainabitConnect={chainabit.reconnect}
                      providers={battleProviders}
                      isLoadingProviders={isLoadingProviders}
                      providerModels={filteredProviderModels}
                      isLoadingModels={isLoadingModels}
                      selectedProviderKey={selectedProviderKey}
                      onProviderChange={(key) => {
                        setSelectedProviderKey(key)
                        setSelectedModelKey('')
                      }}
                      selectedModelKey={selectedModelKey}
                      onModelChange={setSelectedModelKey}
                    />
                  </div>
                )}

                {/* Lenser policy — overlay for any battle when AI lensers participate */}
                <div className="border-t border-surface-border pt-6 space-y-4">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-greyscale-400">
                      Lenser Policy
                    </h4>
                    <Tooltip
                      content="AI lensers bring their own model binding, funding source, and memory. These settings control how much of that personal setup carries into the battle, ensuring a fair and auditable competition."
                      position="bottom"
                      contentClassName="whitespace-normal w-72 text-[11px]"
                    >
                      <Info
                        size={13}
                        className="text-greyscale-400 hover:text-greyscale-600 cursor-default"
                      />
                    </Tooltip>
                    {stepAction('/tutorials/battle-walkthroughs/lenser-battle', 'Lenser battles')}
                  </div>
                  <LenserBattlePolicyPanel
                    value={lenserBattlePolicy}
                    onChange={setLenserBattlePolicy}
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-status-red/20 bg-status-red/5 px-4 py-3 text-sm text-status-red">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 8: Schedule execution ────────────────────────── */}
            {step === 8 && (
              <div className="space-y-5">
                {AUTO_EXEC_TYPES.includes(battleType) ? (
                  <>
                    {/* Toggle row — copy is conditional on enabled state so it
                        always reflects the current action, not a future promise */}
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                          Schedule automatic execution
                        </p>
                        <p className="text-xs text-greyscale-400 mt-0.5">
                          {scheduleEnabled
                            ? 'AI contenders run server-side at the time you pick below.'
                            : 'Enable to pick when AI contenders run automatically.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={scheduleEnabled}
                        onClick={() => {
                          setScheduleEnabled((v) => !v)
                          // Clear picks when disabling so stale state doesn't
                          // persist if the user toggles back.
                          if (scheduleEnabled) {
                            setScheduleDate('')
                            setScheduleHour('')
                            setScheduleMinute('')
                            setError(null)
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                          scheduleEnabled
                            ? 'bg-primary-yellow-500'
                            : 'bg-greyscale-200 dark:bg-greyscale-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                            scheduleEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {scheduleEnabled &&
                      (() => {
                        const tz = localTimezone()
                        const blockedHours = pastHoursForDate(scheduleDate)
                        const blockedMinutes = pastMinutesForDateHour(
                          scheduleDate,
                          scheduleHour !== '' ? (scheduleHour as number) : -1
                        )
                        const preview =
                          scheduleDate && scheduleHour !== '' && scheduleMinute !== ''
                            ? formatSchedulePreview(
                                scheduleDate,
                                scheduleHour as number,
                                scheduleMinute as number
                              )
                            : null
                        const isPastSelection =
                          preview === null &&
                          scheduleDate !== '' &&
                          scheduleHour !== '' &&
                          scheduleMinute !== ''

                        return (
                          <div className="space-y-4 rounded-2xl border border-surface-border p-4">
                            {/* Timezone badge */}
                            <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-xs text-greyscale-500 dark:text-greyscale-400">
                              <Info size={13} className="flex-shrink-0 text-primary-yellow-500" />
                              Times are in your local timezone:{' '}
                              <span className="font-semibold text-greyscale-900 dark:text-greyscale-50">
                                {tz}
                              </span>
                            </div>

                            {/* Date picker */}
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                                Date
                              </label>
                              <input
                                type="date"
                                value={scheduleDate}
                                min={minScheduleDateLocal()}
                                onChange={(e) => {
                                  setScheduleDate(e.target.value)
                                  // Reset hour/minute when date changes — previously valid
                                  // picks may now be in the past for the new date.
                                  setScheduleHour('')
                                  setScheduleMinute('')
                                }}
                                className="w-full rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-sm text-greyscale-900 dark:text-greyscale-50 focus:border-primary-yellow-500 focus:outline-none"
                              />
                            </div>

                            {/* Hour + Minute selectors */}
                            {scheduleDate && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                                    Hour
                                  </label>
                                  <select
                                    value={scheduleHour}
                                    onChange={(e) => {
                                      setScheduleHour(
                                        e.target.value === '' ? '' : Number(e.target.value)
                                      )
                                      setScheduleMinute('')
                                    }}
                                    className="w-full rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-sm text-greyscale-900 dark:text-greyscale-50 focus:border-primary-yellow-500 focus:outline-none"
                                  >
                                    <option value="">— hour —</option>
                                    {Array.from({ length: 24 }, (_, h) => (
                                      <option key={h} value={h} disabled={blockedHours.has(h)}>
                                        {String(h).padStart(2, '0')}:xx
                                        {blockedHours.has(h) ? ' (past)' : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                                    Minute
                                  </label>
                                  <select
                                    value={scheduleMinute}
                                    onChange={(e) =>
                                      setScheduleMinute(
                                        e.target.value === '' ? '' : Number(e.target.value)
                                      )
                                    }
                                    disabled={scheduleHour === ''}
                                    className="w-full rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-sm text-greyscale-900 dark:text-greyscale-50 focus:border-primary-yellow-500 focus:outline-none disabled:opacity-50"
                                  >
                                    <option value="">— minute —</option>
                                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                                      <option key={m} value={m} disabled={blockedMinutes.has(m)}>
                                        :{String(m).padStart(2, '0')}
                                        {blockedMinutes.has(m) ? ' (past)' : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}

                            {/* Execution preview */}
                            {preview && (
                              <div className="flex items-center gap-2 rounded-xl border border-primary-yellow-500/20 bg-primary-yellow-500/5 px-3 py-2 text-xs text-greyscale-700 dark:text-greyscale-300">
                                <Info size={13} className="flex-shrink-0 text-primary-yellow-500" />
                                Execution scheduled for:{' '}
                                <span className="font-semibold">{preview}</span>
                              </div>
                            )}
                            {isPastSelection && (
                              <p className="text-xs text-status-red">
                                The selected time is in the past. Please pick a future date and
                                time.
                              </p>
                            )}

                            {/* Voting window */}
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                                Voting window
                              </label>
                              <select
                                value={votingDurationHours}
                                onChange={(e) => setVotingDurationHours(Number(e.target.value))}
                                className="w-full rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-sm text-greyscale-900 dark:text-greyscale-50 focus:border-primary-yellow-500 focus:outline-none"
                              >
                                {[1, 6, 12, 24, 48, 72].map((h) => (
                                  <option key={h} value={h}>
                                    {h === 1 ? '1 hour' : `${h} hours`}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Auto-publish toggle */}
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                                  Auto-publish results
                                </p>
                                <p className="text-xs text-greyscale-400 mt-0.5">
                                  Results publish automatically after voting closes.
                                </p>
                              </div>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={autoPublish}
                                onClick={() => setAutoPublish((v) => !v)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                                  autoPublish
                                    ? 'bg-primary-yellow-500'
                                    : 'bg-greyscale-200 dark:bg-greyscale-700'
                                }`}
                              >
                                <span
                                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                                    autoPublish ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        )
                      })()}
                  </>
                ) : (
                  <p className="py-6 text-center text-sm text-greyscale-400">
                    Automatic scheduling is only available for AI vs AI and Workflow battles.
                  </p>
                )}
              </div>
            )}

            {/* ── Step 9: Invite contenders ─────────────────────────── */}
            {step === 9 && (
              <div className="space-y-4">
                {battleType === 'ai_vs_ai' && (
                  <div className="flex items-start gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2.5 text-xs text-greyscale-500 dark:text-greyscale-400">
                    <Info size={13} className="mt-0.5 flex-shrink-0 text-primary-yellow-500" />
                    <span>
                      AI lensers you invite compete as{' '}
                      <strong className="text-greyscale-700 dark:text-greyscale-200">
                        named identities
                      </strong>
                      . Their execution runs under the model and funding you configured — they do
                      not spend personal credits.
                    </span>
                  </div>
                )}
                <ContenderInviteStep
                  slotA={slotA}
                  slotB={slotB}
                  onChangeSlotA={setSlotA}
                  onChangeSlotB={setSlotB}
                  error={inviteError}
                  battleType={battleType}
                />
              </div>
            )}

            {/* ── Step 10: Contender Lenses ─────────────────────────── */}
            {step === 10 && activeBattleId && (
              <div className="space-y-4">
                <div className="flex items-start gap-2 rounded-xl border border-surface-border bg-surface-raised px-3 py-2.5 text-xs text-greyscale-500 dark:text-greyscale-400">
                  <Info size={13} className="mt-0.5 flex-shrink-0 text-primary-yellow-500" />
                  <span>
                    {taskSource === 'workflow'
                      ? 'Both contenders run the shared workflow. A per-contender lens can add a personal style or output transform — optional.'
                      : 'Both contenders share the task lens you selected. Assigning a lens here gives each contender a personal approach layered on top. Skip if both sides should execute the shared task directly.'}
                  </span>
                </div>
                <LensAssignmentStep
                  battleId={activeBattleId}
                  contenderAId={contenderAId}
                  contenderAName={contenderAName}
                  contenderBId={contenderBId}
                  contenderBName={contenderBName}
                />
              </div>
            )}

            {/* ── Step 11: Automation (owner-only, requires battle to exist) ── */}
            {step === 11 && activeBattleId && (
              <BattleAutomationSettings
                battleId={activeBattleId}
                autoAssignContenders={autoAssignContenders}
                autoPromote={autoPromote}
                onChangeAutoAssign={setAutoAssignContenders}
                onChangeAutoPromote={setAutoPromote}
                onReadinessChange={setAutomationReady}
              />
            )}
            {step === 11 && !activeBattleId && (
              <p className="py-8 text-center text-sm text-greyscale-400">
                Complete the previous steps to configure automation settings.
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </StepWizard>
    </div>
  )
}
