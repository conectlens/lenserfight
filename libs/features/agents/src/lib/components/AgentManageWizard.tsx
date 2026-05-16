import React, { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart3, BookOpen, Clock, Loader2, Check, X, Sparkles, ToggleRight } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, StepWizard, Badge, Tooltip, HelpButton } from '@lenserfight/ui/components'
import type { WizardStepConfig } from '@lenserfight/ui/components'
import { Field, Input, Switch } from '@lenserfight/ui/forms'
import { AgentIdentityCard } from '@lenserfight/ui/modals'
import { useWizardStep } from '@lenserfight/ui/routing'
import { queryKeys } from '@lenserfight/data/cache'
import { agentsService } from '@lenserfight/data/repositories'
import { AgentModelBindingMode } from '@lenserfight/types'
import { useLenserWorkspace } from '@lenserfight/features/profile'
import { useCreateLens, CreateLensModal } from '@lenserfight/features/lenses'
import { useAgentDetail } from '../hooks/useAgentDetail'
import { useAgentPersonality } from '../hooks/useAgentPersonality'
import { useCreateAgent } from '../hooks/useCreateAgent'
import { useHandleCheck } from '../hooks/useHandleCheck'
import { AgentStatusBadge } from './AgentStatusBadge'
import { AgentQuotaBar } from './AgentQuotaBar'
import { AgentPersonalityStep } from './AgentPersonalityStep'

const MODEL_MODES: AgentModelBindingMode[] = ['single', 'multi', 'dynamic']

const POLICY_TOOLTIPS: Record<string, string> = {
  can_join_battles: 'Allow this agent to participate in battle submissions as a lenser.',
  can_vote: 'Allow this agent to cast votes during judging phases.',
  can_create_battles: 'Allow this agent to open new battle threads autonomously.',
  can_receive_sponsorship: 'Make this agent profile eligible for sponsorship links.',
}

const MODEL_MODE_TOOLTIPS: Record<string, string> = {
  single: 'Always use one pinned model. Predictable cost and latency.',
  multi: 'Switch between a fixed set of models per task type.',
  dynamic: 'Select the best-fit model at inference time. Requires a gateway with multi-model routing.',
}

const WIZARD_STEPS_CREATE: WizardStepConfig[] = [
  {
    label: 'Identity',
    title: 'Create AI agent',
    description: 'Give the agent a clear identity — handle and display name.',
    icon: <Sparkles size={20} />,
    action: (
      <HelpButton
        path="/tutorials/agent-walkthroughs/create-your-first-agent"
        label="Agent Guide"
      />
    ),
  },
  {
    label: 'Permissions',
    title: 'Agent permissions',
    description: 'Control what this agent is allowed to do.',
    icon: <ToggleRight size={20} />,
  },
  {
    label: 'Personality',
    title: 'Personality & instruction lens',
    description: 'Set the agent role, tone, and default instruction prompt.',
    icon: <Sparkles size={20} />,
  },
  {
    label: 'Status',
    title: 'Status & limits',
    description: "Today's usage and daily quota limits for this agent.",
    icon: <BarChart3 size={20} />,
  },
]

const WIZARD_STEPS_MANAGE: WizardStepConfig[] = [
  {
    label: 'Permissions',
    title: 'Agent permissions',
    description: 'Control what this agent is allowed to do.',
    icon: <ToggleRight size={20} />,
  },
  {
    label: 'Personality',
    title: 'Personality & instruction lens',
    description: 'Set the agent role, tone, and default instruction prompt.',
    icon: <Sparkles size={20} />,
  },
  {
    label: 'Status',
    title: 'Status & limits',
    description: "Today's usage and daily quota limits for this agent.",
    icon: <BarChart3 size={20} />,
  },
]

interface QuotaEditFormProps {
  agentId: string
  agent: import('@lenserfight/data/repositories').AgentProfileView
  queryClient: import('@tanstack/react-query').QueryClient
}

const QuotaEditForm: React.FC<QuotaEditFormProps> = ({ agentId, agent, queryClient }) => {
  const [maxBattles, setMaxBattles] = useState(agent.max_daily_battles)
  const [maxVotes, setMaxVotes] = useState(agent.max_daily_votes)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaved(false)
    try {
      await agentsService.updatePolicy(agentId, {
        max_daily_battles: maxBattles,
        max_daily_votes: maxVotes,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }, [agentId, maxBattles, maxVotes, queryClient])

  return (
    <div className="bg-surface-raised border border-surface-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-greyscale-500" />
          <span className="text-xs font-medium text-greyscale-500 dark:text-greyscale-400 uppercase tracking-wide">
            Daily Limits
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={saving}
          isLoading={saving}
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <label className="text-greyscale-400 text-xs mb-1 block">Battles / day</label>
          <input
            type="number"
            min={0}
            max={100}
            value={maxBattles}
            onChange={(e) => setMaxBattles(Number(e.target.value))}
            className="w-full rounded-lg border border-surface-border bg-surface-base px-2 py-1 text-sm font-bold text-greyscale-900 dark:text-greyscale-50 focus:outline-none focus:ring-2 focus:ring-primary-yellow-500"
          />
        </div>
        <div>
          <label className="text-greyscale-400 text-xs mb-1 block">Votes / day</label>
          <input
            type="number"
            min={0}
            max={100}
            value={maxVotes}
            onChange={(e) => setMaxVotes(Number(e.target.value))}
            className="w-full rounded-lg border border-surface-border bg-surface-base px-2 py-1 text-sm font-bold text-greyscale-900 dark:text-greyscale-50 focus:outline-none focus:ring-2 focus:ring-primary-yellow-500"
          />
        </div>
        <div>
          <Tooltip content="Spending cap in platform credits. Adjust this at account level." position="top">
            <p className="text-greyscale-400 text-xs mb-1 cursor-default">Credits</p>
          </Tooltip>
          <p className="font-bold text-greyscale-900 dark:text-greyscale-50 py-1">
            {agent.spending_limit_credits.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}

export interface AgentManageWizardProps {
  /** Omit to start in create mode (step 0 collects identity). */
  agentId?: string
  /** Omit in create mode; required when editing an existing agent. */
  handle?: string
  onDone: () => void
}

export const AgentManageWizard: React.FC<AgentManageWizardProps> = ({ agentId: initialAgentId, handle: initialHandle, onDone }) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isCreateMode = !initialAgentId

  // Track the created agent id when coming through the create flow
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null)
  const [createdHandle, setCreatedHandle] = useState<string | null>(null)

  const agentId = initialAgentId ?? createdAgentId ?? ''
  const handle = initialHandle ?? createdHandle ?? ''

  const steps = isCreateMode ? WIZARD_STEPS_CREATE : WIZARD_STEPS_MANAGE
  const maxStep = steps.length - 1
  const { step, nextStep, prevStep, setStep } = useWizardStep({ maxStep })

  // ── Identity step state (create mode only) ──────────────────────────────
  const { humanWorkspace } = useLenserWorkspace()
  const { submit: createAgent, isSubmitting: isCreating } = useCreateAgent(humanWorkspace?.id ?? '')
  const [displayName, setDisplayName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const {
    handle: rawHandle,
    setHandle,
    normalizedHandle,
    isCheckingHandle,
    isHandleUnique,
    handleError,
    suggestions,
  } = useHandleCheck(3)

  // ── Existing agent state (permissions / personality / status steps) ──────
  const { data: agent, isLoading } = useAgentDetail(agentId)
  const [policyLoading, setPolicyLoading] = useState(false)

  const [pendingPersonalityNote, setPendingPersonalityNote] = useState<string>('')
  const [pendingLensId, setPendingLensId] = useState<string | null>(null)
  const { savePersonalityNote, bindLens, isSaving: personalitySaving, error: personalityError } = useAgentPersonality(agentId)

  const lensModal = useCreateLens()

  // ── Identity step: create & advance ─────────────────────────────────────
  const handleCreateNext = async () => {
    const display = displayName.trim()
    if (!display || display.length < 2) {
      setCreateError('Display name must be at least 2 characters.')
      return
    }
    if (!normalizedHandle || normalizedHandle.length < 3) {
      setCreateError('Handle must be at least 3 characters.')
      return
    }
    if (!isHandleUnique) return
    if (!humanWorkspace) return

    setCreateError(null)
    try {
      const result = await createAgent(normalizedHandle, display)
      setCreatedAgentId(result.ai_lenser_id)
      setCreatedHandle(normalizedHandle)
      nextStep()
    } catch (e) {
      const err = e as { code?: string; message?: string }
      if (err?.code === '23505' || err?.message?.includes('unique')) {
        setCreateError('Handle is already taken.')
        return
      }
      if (err?.message?.includes('P0004') || err?.message?.includes('Maximum 5')) {
        setCreateError('Maximum of 5 AI agents reached. Remove an existing agent to create a new one.')
        return
      }
      setCreateError(err?.message ?? 'Failed to create agent.')
    }
  }

  // ── Permissions step ─────────────────────────────────────────────────────
  const handleTogglePolicy = async (field: string, value: boolean | AgentModelBindingMode) => {
    if (!agentId || !agent) return
    setPolicyLoading(true)
    try {
      await agentsService.updatePolicy(agent.ai_lenser_id, { [field]: value })
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId) })
    } catch (e) {
      console.error('Failed to update policy', e)
    } finally {
      setPolicyLoading(false)
    }
  }

  // ── Personality step ──────────────────────────────────────────────────────
  const handlePersonalityNext = async () => {
    try {
      await savePersonalityNote(pendingPersonalityNote || null)
      if (pendingLensId) {
        await bindLens(pendingLensId)
      }
    } catch {
      return
    }
    nextStep()
  }

  // ── Done: navigate to new profile if coming from create flow ─────────────
  const handleDone = () => {
    if (isCreateMode && handle) {
      navigate(`/lenser/${handle}`)
    }
    onDone()
  }

  // ── Step index offsets (create mode has identity at step 0) ──────────────
  // In create mode: 0=identity, 1=permissions, 2=personality, 3=status
  // In manage mode: 0=permissions, 1=personality, 2=status
  const permissionsStep = isCreateMode ? 1 : 0
  const personalityStep = isCreateMode ? 2 : 1
  const statusStep = isCreateMode ? 3 : 2

  // ── Agent loading skeleton (shown after creation while data loads) ────────
  const needsAgentData = step >= permissionsStep
  const agentLoading = needsAgentData && agentId && (isLoading || !agent)

  if (agentLoading) {
    return (
      <div className="space-y-4 animate-pulse py-4">
        <div className="h-20 bg-surface-border rounded-2xl" />
        <div className="h-6 bg-surface-border rounded w-1/2" />
        <div className="h-10 bg-surface-border rounded-xl" />
        <div className="h-10 bg-surface-border rounded-xl" />
      </div>
    )
  }

  const identityCard = agent ? (
    <AgentIdentityCard
      displayName={agent.display_name}
      handle={agent.handle}
      avatarSrc={agent.avatar_url}
      modelCount={agent.model_count}
      lensCount={agent.lens_count}
      runtimePref={agent.runtime_pref}
      suspendedReason={agent.suspended_reason}
      agentUuid={agentId}
      statusBadge={
        <AgentStatusBadge isActive={agent.is_active} suspendedAt={agent.suspended_at} />
      }
      className="mb-4"
    />
  ) : null

  // ── Step content ──────────────────────────────────────────────────────────
  let stepContent: React.ReactNode

  if (step === 0 && isCreateMode) {
    stepContent = (
      <div className="space-y-4">
        <Field
          id="agent-display-name"
          label="Display name"
          required
          hint="Shown across the app on cards, profiles, and management panels."
        >
          <Input
            id="agent-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="My Battle Bot"
            maxLength={64}
          />
        </Field>

        <Field
          id="agent-handle"
          label="Handle"
          required
          error={handleError ?? undefined}
          hint="Letters, numbers, hyphens, and underscores only."
        >
          <div className="relative">
            <Input
              id="agent-handle"
              value={rawHandle}
              onChange={(e) => setHandle(e.target.value.replace(/[^a-z0-9_-]/gi, '').toLowerCase())}
              placeholder="my-battle-bot"
              maxLength={32}
              startAdornment={<span className="text-sm text-greyscale-400">@</span>}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {isCheckingHandle ? (
                <Loader2 className="w-4 h-4 text-greyscale-400 animate-spin" />
              ) : isHandleUnique ? (
                <Check className="w-4 h-4 text-status-green" />
              ) : handleError && rawHandle.length > 0 ? (
                <X className="w-4 h-4 text-status-red" />
              ) : null}
            </div>
          </div>

          {suggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-greyscale-500 mb-1.5">Suggestions:</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    onClick={() => setHandle(s)}
                    className="px-2.5 py-1 bg-surface-base hover:bg-primary/10 border border-surface-border rounded-full text-xs font-medium text-greyscale-600 transition-colors"
                  >
                    @{s}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Field>

        {createError && (
          <p className="text-sm font-medium text-status-red">{createError}</p>
        )}

        {!humanWorkspace && (
          <p className="text-sm font-medium text-status-red">
            Switch back to your human workspace to create a new AI Lenser.
          </p>
        )}
      </div>
    )
  } else if (step === permissionsStep && agent) {
    stepContent = (
      <div className="space-y-4">
        {identityCard}

        <HelpButton
          path="/how-to/agents/manage-agent-settings"
          label="Permissions guide"
          className="mb-1"
        />

        <div className="space-y-1 divide-y divide-surface-border">
          {([
            { field: 'can_join_battles', label: 'Can join battles', value: agent.can_join_battles },
            { field: 'can_vote', label: 'Can vote', value: agent.can_vote },
            { field: 'can_create_battles', label: 'Can create battles', value: agent.can_create_battles },
            { field: 'can_receive_sponsorship', label: 'Can receive sponsorship', value: agent.can_receive_sponsorship },
          ] as const).map(({ field, label, value }) => (
            <div key={field} className="flex items-center justify-between py-3">
              <Tooltip content={POLICY_TOOLTIPS[field]} position="right">
                <span className="text-sm text-greyscale-700 dark:text-greyscale-300 cursor-default">{label}</span>
              </Tooltip>
              <Switch
                checked={value}
                onChange={(v) => handleTogglePolicy(field, v)}
                disabled={policyLoading}
                size="sm"
              />
            </div>
          ))}
        </div>

        <div className="pt-2">
          <div className="flex items-center gap-1.5 mb-2">
            <Tooltip
              content="Controls how this agent selects AI models at inference time."
              position="right"
            >
              <span className="text-xs font-medium text-greyscale-500 dark:text-greyscale-400 uppercase tracking-wide cursor-default">
                Model Mode
              </span>
            </Tooltip>
          </div>
          <div className="flex gap-2">
            {MODEL_MODES.map((mode) => (
              <Tooltip key={mode} content={MODEL_MODE_TOOLTIPS[mode]} position="top">
                <Button
                  variant={agent.model_binding_mode === mode ? 'dark' : 'secondary'}
                  size="sm"
                  disabled={policyLoading}
                  onClick={() => handleTogglePolicy('model_binding_mode', mode)}
                  className="capitalize w-auto"
                >
                  {mode}
                </Button>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    )
  } else if (step === personalityStep) {
    stepContent = (
      <div className="space-y-4">
        {identityCard}
        <HelpButton
          path="/how-to/agents/manage-agent-settings#personality--instruction-lens"
          label="Personality guide"
          className="mb-1"
        />
        <AgentPersonalityStep
          aiLenserId={agentId}
          agentHandle={handle}
          currentPersonalityNote={agent?.personality_note ?? null}
          currentDefaultLensId={null}
          onPersonalityNoteChange={setPendingPersonalityNote}
          onLensSelect={setPendingLensId}
          onCreateLens={() => lensModal.openModal({})}
        />
        {personalityError && (
          <p className="text-xs text-status-red">{personalityError}</p>
        )}
      </div>
    )
  } else if (step === statusStep && agent) {
    stepContent = (
      <div className="space-y-4">
        {identityCard}

        <HelpButton
          path="/how-to/agents/manage-agent-settings#status--limits"
          label="Quota guide"
          className="mb-1"
        />

        <div className="bg-surface-raised border border-surface-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tooltip content="Usage counters reset at UTC midnight via the platform CRON job." position="right">
              <span className="flex items-center gap-2 cursor-default">
                <BarChart3 size={14} className="text-greyscale-500" />
                <span className="text-xs font-medium text-greyscale-500 dark:text-greyscale-400 uppercase tracking-wide">
                  Today's Usage
                </span>
              </span>
            </Tooltip>
          </div>
          <AgentQuotaBar
            battlesUsed={agent.battles_used}
            maxDailyBattles={agent.max_daily_battles}
            votesUsed={agent.votes_used}
            maxDailyVotes={agent.max_daily_votes}
          />
        </div>

        <QuotaEditForm agentId={agentId} agent={agent} queryClient={queryClient} />

        <div className="flex items-center gap-2 text-sm">
          <BookOpen size={14} className="text-greyscale-400" />
          <Link
            to={`/lenser/${handle}`}
            className="text-primary-yellow-600 dark:text-primary-yellow-400 hover:underline"
          >
            View public profile @{handle}
          </Link>
        </div>
      </div>
    )
  } else {
    stepContent = null
  }

  // ── canProceed per step ───────────────────────────────────────────────────
  let canProceed: boolean
  if (step === 0 && isCreateMode) {
    canProceed = !!humanWorkspace && isHandleUnique && displayName.trim().length >= 2 && !isCheckingHandle
  } else if (step === permissionsStep) {
    canProceed = !policyLoading
  } else if (step === personalityStep) {
    canProceed = !personalitySaving
  } else {
    canProceed = true
  }

  // ── onNext per step ───────────────────────────────────────────────────────
  const handleNext = step === 0 && isCreateMode
    ? handleCreateNext
    : step === personalityStep
      ? handlePersonalityNext
      : nextStep

  return (
    <>
      <StepWizard
        steps={steps}
        currentStep={step}
        onNext={handleNext}
        onBack={prevStep}
        onComplete={handleDone}
        onCancel={onDone}
        canProceed={canProceed}
        isNextLoading={step === 0 && isCreateMode ? isCreating : false}
        completeLabel="Done"
        completeIcon={<Badge color="green" size="sm">✓</Badge>}
      >
        {stepContent}
      </StepWizard>

      <CreateLensModal
        isOpen={lensModal.isOpen}
        onClose={lensModal.closeModal}
        onSubmit={() => lensModal.submit()}
        form={lensModal.form}
        isSubmitting={lensModal.isSubmitting}
        error={lensModal.error}
        isEditMode={lensModal.isEditMode}
      />
    </>
  )
}
