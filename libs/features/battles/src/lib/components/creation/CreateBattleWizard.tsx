import { Badge, Button, HelpButton, SegmentedControl, StepWizard, Tooltip } from '@lenserfight/ui/components'
import type { WizardStepConfig } from '@lenserfight/ui/components'
import { Input, TextArea } from '@lenserfight/ui/forms'
import { battlesService, battlesRepository, workflowsService, lensesService, battleExecutionService } from '@lenserfight/data/repositories'
import type { BattleTemplateRecord, WorkflowRecord } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useAIProviders, useAIModelsByProvider } from '@lenserfight/features/generations'
import { useFundingSource, FundingSourceToggle } from '@lenserfight/features/lenses'
import { useLenser } from '@lenserfight/features/profile'
import { useChainabitConnection } from '@lenserfight/features/store'
import { useWizardStep } from '@lenserfight/ui/routing'
import { normalizeError } from '@lenserfight/shared/error'
import { isValidUUID } from '@lenserfight/utils/validation'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { GitBranch, HelpCircle, Info, Layers, Swords, Trophy } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { BattleAutomationSettings } from './BattleAutomationSettings'
import { BattleTypeSelector } from './BattleTypeSelector'
import { ContenderInviteStep } from './ContenderInviteStep'
import { HandicapConfigPanel } from './HandicapConfigPanel'
import { LensAssignmentStep } from './LensAssignmentStep'
import { LenserBattlePolicyPanel } from './LenserBattlePolicyPanel'
import type { LenserSearchResult } from './LenserSearchPicker'
import { SharedParameterStep } from './SharedParameterStep'
import { VoterEligibilitySelector } from './VoterEligibilitySelector'
import {
  type BattleFormat,
  FORMAT_LABEL,
  getDefaultBattleTypeForFormat,
  getTypeStepCopy,
  isBattleTypeAllowedForFormat,
  isCompatibleCombination,
} from './battleCompatibility'
import { DEFAULT_LENSER_BATTLE_POLICY } from '@lenserfight/domain/battle-governance'
import type { LenserBattlePolicy } from '@lenserfight/domain/battle-governance'

import type { AIHandicapConfig, BattleType, VoterEligibility } from '../../types/battle.types'
import type { LensViewModel } from '@lenserfight/types'
import { useInviteContender } from '../../hooks/mutations/useInviteContender'

// ─── Step config ─────────────────────────────────────────────────────────────

const CONFIG_HELP_CONTENT = (
  <div className="space-y-3 p-1 text-left leading-relaxed">
    <div>
      <strong className="text-primary-yellow-600 dark:text-primary-yellow-400">Voter eligibility</strong>
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
      <strong className="text-primary-yellow-600 dark:text-primary-yellow-400">Execution context</strong>
      <p className="mt-0.5 text-greyscale-600 dark:text-greyscale-300">
        Sets which AI provider, model, and funding source runs this battle.
      </p>
    </div>
  </div>
)

const stepAction = (path: string, label: string) => (
  <HelpButton path={path} label={label} />
)

const BASE_WIZARD_STEPS: WizardStepConfig[] = [
  {
    label: 'Format',
    title: 'Choose battle format',
    description: 'Select whether to use a workflow, a single lens prompt, or start a Lenser Battle.',
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
    description: 'Set fair input values that every contender receives. Ensures an apples-to-apples comparison.',
    action: stepAction('/tutorials/battle-walkthroughs/lens-battle-params', 'Lens parameters'),
  },
  {
    label: 'Basics',
    title: 'Battle basics',
    description: 'Give your battle a title and description.',
    action: stepAction('/how-to/battles/create-a-battle', 'Create a battle'),
  },
  {
    label: 'Type',
    title: 'Battle type',
    description: 'Choose who competes and how voting works.',
    action: stepAction('/how-to/battles/battle-types', 'Battle types'),
  },
  {
    label: 'Config',
    title: 'Battle configuration',
    description: 'Set voter eligibility, AI handicap, and execution context.',
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
    label: 'Contenders',
    title: 'Invite contenders',
    description: 'Add up to two contenders by their lenser handle or display name. You can skip and invite later.',
    action: stepAction('/how-to/battles/join-and-submit', 'Joining a battle'),
  },
  {
    label: 'Lenses',
    title: 'Assign Lenses',
    description: 'Lenses define how each contender approaches the prompt. Optional — assign later from the battle page.',
    action: stepAction('/tutorials/walkthroughs/create-a-lens', 'About lenses'),
  },
  {
    label: 'Automation',
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

const AI_BATTLE_TYPES: BattleType[] = ['ai_vs_ai', 'human_vs_ai', 'human_vs_human_ai_votes', 'lenser_battle']
const AUTO_EXEC_TYPES: BattleType[] = ['ai_vs_ai', 'workflow_battle']

// Step 0 format cards — declarative so visual hierarchy lives in data, not
// triplicated JSX. `tier` drives the Recommended / Experimental badge surface.
interface FormatCardConfig {
  value: BattleFormat
  title: string
  subtitle: string
  Icon: React.ComponentType<{ size?: number; className?: string }>
  helpLabel: string
  docsPath: string
  tier: 'flagship' | 'standard' | 'experimental'
}

const FORMAT_CARDS: FormatCardConfig[] = [
  {
    value: 'workflow',
    title: 'Workflow Battle',
    subtitle: 'Multi-step lens workflow — ideal for structured model comparisons',
    Icon: GitBranch,
    helpLabel: 'About Workflow Battles',
    docsPath: '/tutorials/battle-walkthroughs/workflow-battle',
    tier: 'flagship',
  },
  {
    value: 'lens',
    title: 'Lens Battle',
    subtitle: 'Use a single prompt lens',
    Icon: Layers,
    helpLabel: 'About Lens Battles',
    docsPath: '/tutorials/battle-walkthroughs/lens-battle',
    tier: 'standard',
  },
  {
    value: 'lenser_battle',
    title: 'Lenser Battle',
    subtitle: 'Named lensers compete with their own setup',
    Icon: Trophy,
    helpLabel: 'About Lenser Battles',
    docsPath: '/tutorials/battle-walkthroughs/lenser-battle',
    tier: 'experimental',
  },
]

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
  const { step, goToStep } = useWizardStep({ maxStep: BASE_WIZARD_STEPS.length - 1 })

  const [direction, setDirection] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Step 0 — format choice (lazy-init from URL so query is enabled on first render)
  const [battleFormat, setBattleFormat] = useState<'workflow' | 'lens' | 'lenser_battle' | null>(() =>
    readSearchParam(searchParams, 'workflow_id') ? 'workflow' : null
  )

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

  // Lenser Battle policy
  const [lenserBattlePolicy, setLenserBattlePolicy] = useState<LenserBattlePolicy>(
    DEFAULT_LENSER_BATTLE_POLICY,
  )

  // Steps 3–5 — battle config
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  // Default executor: AI vs AI reinforces LenserFight's AI-arena positioning.
  // Auto-corrected via useEffect below if it becomes incompatible with the
  // selected format (e.g. on Lenser Battle).
  const [battleType, setBattleType] = useState<BattleType>('ai_vs_ai')
  const [voterEligibility, setVoterEligibility] = useState<VoterEligibility>('open')
  const [handicap, setHandicap] = useState<AIHandicapConfig>(DEFAULT_HANDICAP)
  // Non-blocking note shown when a Format change auto-cleared an incompatible
  // Battle Type selection. Reframes the change as "updated for compatibility",
  // not "we removed your choice".
  const [compatibilityNote, setCompatibilityNote] = useState<{
    previous: BattleType
    next: BattleType
    formatLabel: string
  } | null>(null)

  // Execution context (funding source + model selection for AI battles)
  const [selectedProviderKey, setSelectedProviderKey] = useState('')
  const [selectedModelKey, setSelectedModelKey] = useState('')
  const { data: battleProviders = [], isLoading: isLoadingProviders } = useAIProviders()
  const { data: battleProviderModels = [], isLoading: isLoadingModels } = useAIModelsByProvider(
    selectedProviderKey || null,
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

  // Format → Type compatibility enforcement. When Format changes and the
  // current Type is no longer in the matrix, snap to the format's recommended
  // default and surface a non-blocking note. Deps are intentionally narrow
  // (battleFormat only) so we don't loop on battleType changes.
  useEffect(() => {
    if (!battleFormat) return
    if (isBattleTypeAllowedForFormat(battleFormat, battleType)) return
    const recommended = getDefaultBattleTypeForFormat(battleFormat)
    setCompatibilityNote({
      previous: battleType,
      next: recommended,
      formatLabel: FORMAT_LABEL[battleFormat],
    })
    setBattleType(recommended)
  }, [battleFormat]) // eslint-disable-line react-hooks/exhaustive-deps

  // Step 6 — scheduling (optional, only for ai_vs_ai / workflow_battle)
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [executionStartsAt, setExecutionStartsAt] = useState('')
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
        const tpl: BattleTemplateRecord | undefined = all.find((t) => t.id === preselectedTemplateId)
        if (!tpl || cancelled) return
        if (!title) setTitle(tpl.title)
        if (!description) setDescription(tpl.task_prompt)
        if (!battleFormat) setBattleFormat('lens')
        goToStep(1)
      } catch (e) {
        console.error('Failed to prefill template', e)
      }
    })()
    return () => { cancelled = true }
  }, [preselectedTemplateId]) // eslint-disable-line

  // ── Fetch existing battle for editing ─────────────────────────────────────
  const isEditMode = !!battleIdFromUrl && step < 7

  useEffect(() => {
    if (battleIdFromUrl && step < 6) {
      const fetchBattleData = async () => {
        try {
          const battle = await battlesService.getBattleById(battleIdFromUrl)
          if (battle && battle.status === 'draft') {
            setTitle(battle.title)
            setDescription(battle.task_prompt.startsWith('Workflow battle: ') || battle.task_prompt.startsWith('Lens battle: ') ? '' : battle.task_prompt)
            setBattleType(battle.battle_type)
            setVoterEligibility(battle.voter_eligibility)
            if (battle.handicap_config) {
              setHandicap(battle.handicap_config as unknown as AIHandicapConfig)
            }
            if (battle.battle_type === 'lenser_battle') {
              setBattleFormat('lenser_battle')
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
            if (step === 0 && (battle.workflow_id || battle.lens_id || battle.battle_type === 'lenser_battle')) {
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

    if (step >= 7 && !battleIdFromUrl) {
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

  const handleBattleTypeChange = (type: BattleType) => {
    // Defense-in-depth: matrix lives in the type selector, but reject any
    // disallowed value here too in case a future caller bypasses the UI.
    if (!isBattleTypeAllowedForFormat(battleFormat, type)) return
    setBattleType(type)
    setCompatibilityNote(null)
    if (type === 'human_vs_human_ai_votes') {
      setVoterEligibility('ai_only')
    } else if (voterEligibility === 'ai_only') {
      setVoterEligibility('open')
    }
  }

  // ── Validation ───────────────────────────────────────────────────────────

  const showsHandicap = AI_BATTLE_TYPES.includes(battleType)

  // Skip steps that don't apply for the selected format:
  // - lenser_battle: skips Source (1), Inputs (2), Type (4)
  // - workflow: skips Inputs (2)
  // - lens: shows all steps
  const go = (next: number) => {
    const isForward = next > step
    let target = next
    if (battleFormat === 'lenser_battle') {
      if (next === 1) target = isForward ? 3 : 0
      if (next === 2) target = isForward ? 3 : 0
      if (next === 4) target = isForward ? 5 : 3
    } else if (battleFormat === 'workflow') {
      if (next === 2) target = isForward ? 3 : 1
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

  // Step 5 needs an execution context (provider + model) when the battle will
  // run AI contenders managed by the platform. Lenser Battles bring their own
  // model binding, so no execution context is required there.
  const aiExecutionRequired = battleFormat !== 'lenser_battle' && AI_BATTLE_TYPES.includes(battleType)
  const aiExecutionValid = !aiExecutionRequired || (!!selectedProviderKey && !!selectedModelKey)

  const sourceValid = battleFormat === 'lenser_battle'
    ? true
    : battleFormat === 'workflow'
      ? !!selectedWorkflowId
      : !!selectedLensId

  // Step 2 (Inputs) is always valid for non-lens formats (skipped).
  // For lens format, it's always passable — the parameter step shows a
  // "no params needed" state when the lens has no parameters.
  const inputsStepValid = true

  const canProceed = (() => {
    if (step === 0) return battleFormat !== null
    if (step === 1) return sourceValid
    if (step === 2) return inputsStepValid
    if (step === 3) return title.trim().length >= 3
    if (step === 5) return aiExecutionValid
    // Step 9 (automation) requires the battle to actually exist so we have a
    // target to attach automation rules to. Otherwise users can press
    // "Complete" with no battle and trip the missing-slug guard in handleFinish.
    if (step === 9) return automationReady && !!computedActiveBattleId
    // Steps 4, 6–8 are always skippable / valid
    return true
  })()

  const stepValidity: boolean[] = [
    battleFormat !== null,                 // 0: Format
    sourceValid,                           // 1: Source
    inputsStepValid,                       // 2: Inputs (lens only)
    title.trim().length >= 3,              // 3: Basics
    true,                                  // 4: Type — always valid
    aiExecutionValid,                      // 5: Config — gates on AI execution context
    true,                                  // 6: Schedule — always skippable
    true,                                  // 7: Contenders — always skippable
    true,                                  // 8: Lenses — always skippable
    automationReady && !!computedActiveBattleId, // 9: Automation
  ]

  // ── Create battle (step 5 → 6) ───────────────────────────────────────────

  const handleCreateBattle = async () => {
    if (!canProceed) return
    setSubmitting(true)
    setError(null)
    try {
      const resolvedBattleType: BattleType = battleFormat === 'lenser_battle' ? 'lenser_battle' : battleType

      // Final compatibility gate — third validation tier matching the matrix.
      // If this ever fires it means the UI permitted an invalid state; fail
      // safely with a structured-ish error rather than corrupting a battle.
      if (!isCompatibleCombination(battleFormat as BattleFormat | null, resolvedBattleType)) {
        throw new Error(
          `Battle type "${resolvedBattleType}" is not allowed for format "${battleFormat}". ` +
          `Go back to the Type step and pick a compatible option.`
        )
      }

      const resolvedPrompt = description.trim() || (battleFormat === 'workflow'
        ? `Workflow battle: ${selectedWorkflowTitle || selectedWorkflowId}`
        : battleFormat === 'lenser_battle'
          ? `Lenser battle`
          : `Lens battle: ${selectedLensTitle || selectedLensId}`)

      const battleInput = {
        title: title.trim(),
        task_prompt: resolvedPrompt,
        battle_type: resolvedBattleType,
        voter_eligibility: voterEligibility,
        handicap: AI_BATTLE_TYPES.includes(resolvedBattleType) ? handicap : undefined,
        ...(battleFormat === 'workflow' && selectedWorkflowId ? { workflow_id: selectedWorkflowId } : {}),
        ...(battleFormat === 'lens' && selectedLensId ? { lens_id: selectedLensId } : {}),
        // Store shared Lens parameter values for fairness
        ...(battleFormat === 'lens' && Object.keys(sharedParamValues).length > 0
          ? { shared_input_snapshot: sharedParamValues }
          : {}),
        // Store Lenser Battle memory/instruction policy
        ...(battleFormat === 'lenser_battle'
          ? { lenser_battle_policy: lenserBattlePolicy as unknown as Record<string, unknown> }
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
        await battleExecutionService.upsertExecutionConfig({
          battle_id: battle.id,
          contender_id: null,
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
          next.set('step', '6')
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
      setInviteError('Cannot invite contenders: battle has not been created yet. Go back and complete the configuration step.')
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
          const result = await invite.mutateAsync({
            battle_id: activeBattleId,
            slot: 'A',
            contender_ref_id: slotA.id,
            display_name: slotA.display_name,
            contender_type: slotA.type === 'ai' ? 'ai_agent' : 'human',
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
          const result = await invite.mutateAsync({
            battle_id: activeBattleId,
            slot: 'B',
            contender_ref_id: slotB.id,
            display_name: slotB.display_name,
            contender_type: slotB.type === 'ai' ? 'ai_agent' : 'human',
          })
          setContenderBId(result.id)
          setContenderBName(result.display_name)
        }
      } else if (existingB) {
        await battlesService.removeContender(existingB.id)
        setContenderBId(undefined)
        setContenderBName(undefined)
      }

      go(8)
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

  // ── Schedule submission (step 6 → 7) ─────────────────────────────────────

  const handleScheduleAndNext = async () => {
    if (scheduleEnabled && executionStartsAt && activeBattleId && AUTO_EXEC_TYPES.includes(battleType)) {
      setSubmitting(true)
      setError(null)
      try {
        await battlesService.scheduleBattle({
          battle_id:             activeBattleId,
          execution_starts_at:   executionStartsAt,
          voting_duration_hours: votingDurationHours,
          auto_publish:          autoPublish,
        })
      } catch (e) {
        setError(normalizeError(e).message)
        setSubmitting(false)
        return
      } finally {
        setSubmitting(false)
      }
    }
    go(7)
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
  const skipButton = step === 6
    ? { label: 'Skip for now', onClick: () => go(7) }
    : step === 7
      ? { label: 'Skip for now', onClick: () => go(8) }
      : step === 8
        ? { label: 'Skip for now', onClick: () => go(9) }
        : step === 9
          ? { label: 'Skip for now', onClick: handleFinish }
          : undefined

  // Next / complete handler varies by step
  const handleNext = step === 5
    ? handleCreateBattle
    : step === 6
      ? handleScheduleAndNext
      : step === 7
        ? handleInvite
        : () => go(step + 1)

  const handleComplete = handleFinish

  // Step 4 (Type) heading + description mutate with Format so users read
  // Step 5 as a refinement of Step 1, not a parallel decision.
  const wizardSteps = useMemo<WizardStepConfig[]>(() => {
    const typeCopy = getTypeStepCopy(battleFormat)
    return BASE_WIZARD_STEPS.map((s, idx) =>
      idx === 4 ? { ...s, title: typeCopy.title, description: typeCopy.description } : s
    )
  }, [battleFormat])

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
        isCompleting={(step === 5 || step === 6) ? submitting : step === 7 ? inviting : false}
        isNextLoading={(step === 5 || step === 6) ? submitting : step === 7 ? inviting : false}
        completeLabel="Go to Battle"
        completeIcon={<Swords size={15} className="mr-1.5" />}
        nextLabel={step === 5 ? (isEditMode ? 'Update Battle' : 'Create Battle') : step === 7 ? 'Invite' : 'Next'}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {FORMAT_CARDS.map((card) => {
                  const isSelected = battleFormat === card.value
                  // Two orthogonal visual channels so users never confuse
                  // "this is selected" with "this is recommended":
                  //   • Selected → greyscale ring + tinted neutral surface (state)
                  //   • Recommended → yellow badge + soft yellow icon  (tier)
                  // Yellow is reserved for tier; greyscale carries selection.
                  return (
                    <div key={card.value} className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setBattleFormat(card.value)}
                        aria-pressed={isSelected}
                        className={`relative !flex-col !gap-3 !rounded-2xl !border-2 !p-6 text-center w-full !h-auto !font-normal !transition-colors ${
                          isSelected
                            ? '!border-greyscale-900 !bg-greyscale-900/[0.04] dark:!border-greyscale-0 dark:!bg-greyscale-0/[0.06] !ring-2 !ring-greyscale-900/10 dark:!ring-greyscale-0/10'
                            : card.tier === 'flagship'
                              ? '!border-primary-yellow-500/30 hover:!border-greyscale-400 dark:hover:!border-greyscale-500 !bg-transparent'
                              : '!border-surface-border hover:!border-greyscale-300 dark:hover:!border-greyscale-600 !bg-transparent'
                        }`}
                      >
                        {card.tier === 'flagship' && (
                          <span className="absolute right-3 top-3">
                            <Badge color="yellow" variant="solid" size="sm">
                              Recommended
                            </Badge>
                          </span>
                        )}
                        {card.tier === 'experimental' && (
                          <span className="absolute right-3 top-3">
                            <Badge color="purple" variant="outline" size="sm">
                              Experimental
                            </Badge>
                          </span>
                        )}
                        <card.Icon
                          size={28}
                          className={
                            isSelected
                              ? 'text-greyscale-900 dark:text-greyscale-0'
                              : card.tier === 'flagship'
                                ? 'text-primary-yellow-500'
                                : 'text-greyscale-400'
                          }
                        />
                        <div>
                          <p className="font-semibold text-sm text-greyscale-900 dark:text-greyscale-50">
                            {card.title}
                          </p>
                          <p className="text-xs text-greyscale-400 mt-0.5">
                            {card.subtitle}
                          </p>
                        </div>
                      </Button>
                      <div className="flex justify-center">
                        <HelpButton path={card.docsPath} label={card.helpLabel} />
                      </div>
                    </div>
                  )
                })}
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

            {/* ── Step 2: Shared inputs (Lens Battle only) ──────────── */}
            {step === 2 && battleFormat === 'lens' && (
              <SharedParameterStep
                lensId={selectedLensId}
                values={sharedParamValues}
                onChange={setSharedParamValues}
              />
            )}

            {/* ── Step 3: Battle basics ─────────────────────────────── */}
            {step === 3 && (
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

            {/* ── Step 4: Battle Type ───────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-4">
                {compatibilityNote && (
                  <div
                    role="status"
                    className="rounded-2xl border border-primary-yellow-500/30 bg-primary-yellow-500/5 px-4 py-3 text-sm text-greyscale-700 dark:text-greyscale-200"
                  >
                    <p className="font-semibold">Selection updated for compatibility</p>
                    <p className="mt-0.5 text-xs text-greyscale-500 dark:text-greyscale-400">
                      {compatibilityNote.formatLabel} doesn&apos;t support that battle type, so we switched to{' '}
                      the recommended option. You can change it below.
                    </p>
                  </div>
                )}
                <BattleTypeSelector
                  value={battleType}
                  onChange={handleBattleTypeChange}
                  battleFormat={battleFormat}
                  onChangeFormat={() => go(0)}
                />
              </div>
            )}

            {/* ── Step 5: Configuration ─────────────────────────────── */}
            {step === 5 && (
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
                      <Info size={13} className="text-greyscale-400 hover:text-greyscale-600 cursor-default" />
                    </Tooltip>
                  </div>
                  <div className="space-y-6">
                    <VoterEligibilitySelector
                      battleType={battleFormat === 'lenser_battle' ? 'lenser_battle' : battleType}
                      value={voterEligibility}
                      onChange={setVoterEligibility}
                    />
                    {showsHandicap && battleFormat !== 'lenser_battle' && (
                      <HandicapConfigPanel value={handicap} onChange={setHandicap} />
                    )}
                  </div>
                </div>

                {battleFormat !== 'lenser_battle' && (
                  <div className="border-t border-surface-border pt-6">
                    <div className="mb-4 flex items-center gap-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-greyscale-400">
                        Execution Context
                      </h4>
                      <Tooltip
                        content="Sets which AI provider, model, and funding source runs this battle. Use BYOK to bring your own API key."
                        position="right"
                        contentClassName="whitespace-normal w-60 text-[11px]"
                      >
                        <Info size={13} className="text-greyscale-400 hover:text-greyscale-600 cursor-default" />
                      </Tooltip>
                    </div>
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
                      onRefreshLocalKeys={battleFunding.refreshLocalKeys}
                      walletBalance={battleFunding.walletBalance}
                      canUseBYOK={battleFunding.canUseBYOK}
                      chainabitState={chainabit.state}
                      chainabitModels={chainabit.models}
                      onChainabitConnect={chainabit.reconnect}
                      providers={battleProviders}
                      isLoadingProviders={isLoadingProviders}
                      providerModels={battleProviderModels}
                      isLoadingModels={isLoadingModels}
                      selectedProviderKey={selectedProviderKey}
                      onProviderChange={(key) => { setSelectedProviderKey(key); setSelectedModelKey('') }}
                      selectedModelKey={selectedModelKey}
                      onModelChange={setSelectedModelKey}
                    />
                  </div>
                )}
                {battleFormat === 'lenser_battle' && (
                  <div className="border-t border-surface-border pt-6 space-y-4">
                    <div className="rounded-2xl border border-primary-yellow-500/20 bg-primary-yellow-500/5 px-4 py-3 text-sm text-greyscale-700 dark:text-greyscale-300">
                      AI lensers in a Lenser Battle use their own model binding, funding source, and memory — no execution context needed from the battle creator.
                    </div>
                    <LenserBattlePolicyPanel
                      value={lenserBattlePolicy}
                      onChange={setLenserBattlePolicy}
                    />
                  </div>
                )}

                {error && (
                  <div className="rounded-2xl border border-status-red/20 bg-status-red/5 px-4 py-3 text-sm text-status-red">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 6: Schedule execution ────────────────────────── */}
            {step === 6 && (
              <div className="space-y-5">
                {AUTO_EXEC_TYPES.includes(battleType) ? (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                          Automatic execution
                        </p>
                        <p className="text-xs text-greyscale-400 mt-0.5">
                          AI contenders run server-side at the scheduled time — no manual trigger needed.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={scheduleEnabled}
                        onClick={() => setScheduleEnabled((v) => !v)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                          scheduleEnabled ? 'bg-primary-yellow-500' : 'bg-greyscale-200 dark:bg-greyscale-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                            scheduleEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {scheduleEnabled && (
                      <div className="space-y-4 rounded-2xl border border-surface-border p-4">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                            Execution start time
                          </label>
                          <input
                            type="datetime-local"
                            value={executionStartsAt}
                            onChange={(e) => setExecutionStartsAt(e.target.value)}
                            // datetime-local interprets the value in the browser's
                            // local timezone. toISOString() returns UTC, which
                            // would be off by the user's tz offset and could let
                            // them pick a past time. Compute "now + 1m" in local
                            // time instead.
                            min={(() => {
                              const d = new Date(Date.now() + 60_000)
                              const pad = (n: number) => String(n).padStart(2, '0')
                              return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
                            })()}
                            className="w-full rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-sm text-greyscale-900 dark:text-greyscale-50 focus:border-primary-yellow-500 focus:outline-none"
                          />
                        </div>

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
                              autoPublish ? 'bg-primary-yellow-500' : 'bg-greyscale-200 dark:bg-greyscale-700'
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
                    )}
                  </>
                ) : (
                  <p className="py-6 text-center text-sm text-greyscale-400">
                    Automatic scheduling is only available for AI vs AI and Workflow battles.
                  </p>
                )}
              </div>
            )}

            {/* ── Step 7: Invite contenders ─────────────────────────── */}
            {step === 7 && (
              <ContenderInviteStep
                slotA={slotA}
                slotB={slotB}
                onChangeSlotA={setSlotA}
                onChangeSlotB={setSlotB}
                error={inviteError}
                battleType={battleType}
              />
            )}

            {/* ── Step 8: Assign Lenses ─────────────────────────────── */}
            {step === 8 && activeBattleId && (
              <LensAssignmentStep
                battleId={activeBattleId}
                contenderAId={contenderAId}
                contenderAName={contenderAName}
                contenderBId={contenderBId}
                contenderBName={contenderBName}
              />
            )}

            {/* ── Step 9: Automation (owner-only, requires battle to exist) ── */}
            {step === 9 && activeBattleId && (
              <BattleAutomationSettings
                battleId={activeBattleId}
                autoAssignContenders={autoAssignContenders}
                autoPromote={autoPromote}
                onChangeAutoAssign={setAutoAssignContenders}
                onChangeAutoPromote={setAutoPromote}
                onReadinessChange={setAutomationReady}
              />
            )}
            {step === 9 && !activeBattleId && (
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
