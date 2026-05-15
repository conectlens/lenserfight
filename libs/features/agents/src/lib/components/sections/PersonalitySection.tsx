import { queryKeys } from '@lenserfight/data/cache'
import { agentsService } from '@lenserfight/data/repositories'
import { useQueryClient } from '@tanstack/react-query'
import { Brain } from 'lucide-react'
import React, { useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { LensBindingPicker } from '../LensBindingPicker'
import { EmptyPanel } from '../EmptyPanel'

import { ProfileCard } from './_shared'
import { SectionPage } from './SectionPage'

export const PersonalitySection: React.FC = () => {
  const {
    agentProfile,
    defaultPersonalityBinding,
    isOwner,
  } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = async (lensId: string, versionId: string | null) => {
    if (!agentProfile?.ai_lenser_id) return
    setSaving(true)
    setError(null)
    try {
      await agentsService.setPersonalityLensBinding(
        agentProfile.ai_lenser_id,
        lensId,
        versionId
      )
      await queryClient.invalidateQueries({
        queryKey: queryKeys.agents.lensBindings(agentProfile.ai_lenser_id),
      })
    } catch (e) {
      setError((e as Error).message ?? 'Failed to bind personality lens.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionPage
      eyebrow="Personality"
      docsPath="/how-to/agents/workspace/personality"
      docsTip="Personality is a free-text note (≤1000 chars) plus a bound lens. Both are injected alongside the system prompt at inference time."
      title="Personality lens"
      description="Fork a community lens or select one of your own lenses to define this agent's personality. The bound lens version becomes the personality source applied to every run."
      toolbar={
        <a
          href="/lenses"
          className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-primary-yellow-300 hover:text-primary-yellow-700 dark:border-gray-700 dark:text-gray-200"
        >
          Open lens studio
        </a>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        {/* Current personality binding */}
        <ProfileCard
          title="Current personality"
          subtitle="Active personality lens for this agent. Applied to every run unless overridden by a workflow node."
        >
          {defaultPersonalityBinding ? (
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <BindingRow label="Lens" value={defaultPersonalityBinding.lens_id.slice(0, 8)} />
              <BindingRow
                label="Version"
                value={
                  defaultPersonalityBinding.version_id
                    ? defaultPersonalityBinding.version_id.slice(0, 8)
                    : 'Latest published'
                }
              />
            </div>
          ) : (
            <EmptyPanel
              icon={<Brain size={20} />}
              title="No personality lens bound"
              description="Fork a community lens or pick one of your own lenses to shape how this agent communicates."
            />
          )}
        </ProfileCard>

        {/* Picker */}
        {isOwner && (
          <LensBindingPicker
            enabled={isOwner && !!agentProfile}
            onSelect={handleSelect}
            bindLabel="Bind personality lens"
            isSaving={saving}
            currentLensId={defaultPersonalityBinding?.lens_id}
            currentVersionId={defaultPersonalityBinding?.version_id}
          />
        )}
      </div>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </p>
      )}
    </SectionPage>
  )
}

const BindingRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <span>{label}</span>
    <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
  </div>
)
