import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, BookOpen, Clock, Sparkles, ToggleRight } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, StepWizard, Badge } from '@lenserfight/ui/components'
import type { WizardStepConfig } from '@lenserfight/ui/components'
import { Switch } from '@lenserfight/ui/forms'
import { AgentIdentityCard } from '@lenserfight/ui/modals'
import { useWizardStep } from '@lenserfight/ui/routing'
import { queryKeys } from '@lenserfight/data/cache'
import { agentsService } from '@lenserfight/data/repositories'
import { AgentModelBindingMode } from '@lenserfight/types'
import { useCreateLens, CreateLensModal } from '@lenserfight/features/lenses'
import { useAgentDetail } from '../hooks/useAgentDetail'
import { useAgentPersonality } from '../hooks/useAgentPersonality'
import { AgentStatusBadge } from './AgentStatusBadge'
import { AgentQuotaBar } from './AgentQuotaBar'
import { AgentPersonalityStep } from './AgentPersonalityStep'

const MODEL_MODES: AgentModelBindingMode[] = ['single', 'multi', 'dynamic']

const WIZARD_STEPS: WizardStepConfig[] = [
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

export interface AgentManageWizardProps {
  agentId: string
  handle: string
  onDone: () => void
}

export const AgentManageWizard: React.FC<AgentManageWizardProps> = ({ agentId, handle, onDone }) => {
  const queryClient = useQueryClient()
  const { data: agent, isLoading } = useAgentDetail(agentId)
  const { step, nextStep, prevStep } = useWizardStep({ maxStep: 2 })
  const [policyLoading, setPolicyLoading] = useState(false)

  // Personality step local state — saved on Next from step 1
  const [pendingPersonalityNote, setPendingPersonalityNote] = useState<string>('')
  const [pendingLensId, setPendingLensId] = useState<string | null>(null)
  const { savePersonalityNote, bindLens, isSaving: personalitySaving, error: personalityError } = useAgentPersonality(agentId)

  // Lens creation modal (for the "Create new lens" button in personality step)
  const lensModal = useCreateLens()

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

  const handlePersonalityNext = async () => {
    try {
      await savePersonalityNote(pendingPersonalityNote || null)
      if (pendingLensId) {
        await bindLens(pendingLensId)
      }
    } catch {
      // error shown by hook, don't advance
      return
    }
    nextStep()
  }

  if (!agentId) {
    return (
      <p className="py-4 text-sm text-status-red">
        No agent ID provided. Open this dialog from the agent management panel.
      </p>
    )
  }

  if (isLoading || !agent) {
    return (
      <div className="space-y-4 animate-pulse py-4">
        <div className="h-20 bg-surface-border rounded-2xl" />
        <div className="h-6 bg-surface-border rounded w-1/2" />
        <div className="h-10 bg-surface-border rounded-xl" />
        <div className="h-10 bg-surface-border rounded-xl" />
      </div>
    )
  }

  const identityCard = (
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
  )

  const stepContent = step === 0 ? (
    <div className="space-y-4">
      {identityCard}

      {/* Policy toggles */}
      <div className="space-y-1 divide-y divide-surface-border">
        {([
          { field: 'can_join_battles', label: 'Can join battles', value: agent.can_join_battles },
          { field: 'can_vote', label: 'Can vote', value: agent.can_vote },
          { field: 'can_create_battles', label: 'Can create battles', value: agent.can_create_battles },
          { field: 'can_receive_sponsorship', label: 'Can receive sponsorship', value: agent.can_receive_sponsorship },
        ] as const).map(({ field, label, value }) => (
          <div key={field} className="flex items-center justify-between py-3">
            <span className="text-sm text-greyscale-700 dark:text-greyscale-300">{label}</span>
            <Switch
              checked={value}
              onChange={(v) => handleTogglePolicy(field, v)}
              disabled={policyLoading}
              size="sm"
            />
          </div>
        ))}
      </div>

      {/* Model binding mode */}
      <div className="pt-2">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs font-medium text-greyscale-500 dark:text-greyscale-400 uppercase tracking-wide">
            Model Mode
          </span>
        </div>
        <div className="flex gap-2">
          {MODEL_MODES.map((mode) => (
            <Button
              key={mode}
              variant={agent.model_binding_mode === mode ? 'dark' : 'secondary'}
              size="sm"
              disabled={policyLoading}
              onClick={() => handleTogglePolicy('model_binding_mode', mode)}
              className="capitalize w-auto"
            >
              {mode}
            </Button>
          ))}
        </div>
      </div>
    </div>
  ) : step === 1 ? (
    <div className="space-y-4">
      {identityCard}
      <AgentPersonalityStep
        aiLenserId={agentId}
        agentHandle={handle}
        currentPersonalityNote={agent.personality_note ?? null}
        currentDefaultLensId={null}
        onPersonalityNoteChange={setPendingPersonalityNote}
        onLensSelect={setPendingLensId}
        onCreateLens={() => lensModal.openModal({})}
      />
      {personalityError && (
        <p className="text-xs text-status-red">{personalityError}</p>
      )}
    </div>
  ) : (
    <div className="space-y-4">
      {identityCard}

      {/* Today's quota */}
      <div className="bg-surface-raised border border-surface-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={14} className="text-greyscale-500" />
          <span className="text-xs font-medium text-greyscale-500 dark:text-greyscale-400 uppercase tracking-wide">
            Today's Usage
          </span>
        </div>
        <AgentQuotaBar
          battlesUsed={agent.battles_used}
          maxDailyBattles={agent.max_daily_battles}
          votesUsed={agent.votes_used}
          maxDailyVotes={agent.max_daily_votes}
        />
      </div>

      {/* Daily limits */}
      <div className="bg-surface-raised border border-surface-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-greyscale-500" />
          <span className="text-xs font-medium text-greyscale-500 dark:text-greyscale-400 uppercase tracking-wide">
            Daily Limits
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-greyscale-400 text-xs mb-0.5">Battles</p>
            <p className="font-bold text-greyscale-900 dark:text-greyscale-50">{agent.max_daily_battles}</p>
          </div>
          <div>
            <p className="text-greyscale-400 text-xs mb-0.5">Votes</p>
            <p className="font-bold text-greyscale-900 dark:text-greyscale-50">{agent.max_daily_votes}</p>
          </div>
          <div>
            <p className="text-greyscale-400 text-xs mb-0.5">Credits</p>
            <p className="font-bold text-greyscale-900 dark:text-greyscale-50">
              {agent.spending_limit_credits.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Public profile link */}
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

  return (
    <>
      <StepWizard
        steps={WIZARD_STEPS}
        currentStep={step}
        onNext={step === 1 ? handlePersonalityNext : nextStep}
        onBack={prevStep}
        onComplete={onDone}
        onCancel={onDone}
        canProceed={!policyLoading && !personalitySaving}
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
