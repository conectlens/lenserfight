import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { AgentPersonalityProfileRecord } from '@lenserfight/types'
import { Tooltip } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Drawer, DrawerFooter } from '@lenserfight/ui/overlays'
import { HelpCircle } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { DrawerDocsLink } from './DrawerDocsLink'

interface Props {
  open: boolean
  onClose: () => void
  aiLenserId: string
  initial?: AgentPersonalityProfileRecord | null
  onSaved?: (record: AgentPersonalityProfileRecord) => void
}

const TONES = ['decisive', 'curious', 'reserved', 'playful', 'formal']
const EXPERTISE = ['novice', 'generalist', 'specialist', 'principal']
const RISK = ['conservative', 'moderate', 'aggressive']
const AUTONOMY = ['observed', 'guided', 'autonomous']
const COMMUNICATION = ['concise', 'detailed', 'explanatory']
const DECISION = ['evidence_first', 'speed_first', 'balanced']
const ESCALATION = ['ask_when_blocked', 'never', 'always_for_writes']

export const PersonalityProfileDrawer: React.FC<Props> = ({
  open,
  onClose,
  aiLenserId,
  initial,
  onSaved,
}) => {
  const isEdit = !!initial
  const [state, setState] = useState({
    name: initial?.name ?? 'Board Director',
    tone: initial?.tone ?? 'decisive',
    expertise_level: initial?.expertise_level ?? 'specialist',
    risk_tolerance: initial?.risk_tolerance ?? 'moderate',
    autonomy_level: initial?.autonomy_level ?? 'guided',
    communication_style: initial?.communication_style ?? 'concise',
    decision_style: initial?.decision_style ?? 'evidence_first',
    escalation_behavior: initial?.escalation_behavior ?? 'ask_when_blocked',
    system_prompt_patch:
      initial?.system_prompt_patch ??
      'Keep outputs operational, concise, and escalation-aware.',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setState({
      name: initial?.name ?? 'Board Director',
      tone: initial?.tone ?? 'decisive',
      expertise_level: initial?.expertise_level ?? 'specialist',
      risk_tolerance: initial?.risk_tolerance ?? 'moderate',
      autonomy_level: initial?.autonomy_level ?? 'guided',
      communication_style: initial?.communication_style ?? 'concise',
      decision_style: initial?.decision_style ?? 'evidence_first',
      escalation_behavior: initial?.escalation_behavior ?? 'ask_when_blocked',
      system_prompt_patch:
        initial?.system_prompt_patch ??
        'Keep outputs operational, concise, and escalation-aware.',
    })
    setError(null)
  }, [open, initial])

  const handleSave = async () => {
    setSubmitting(true)
    setError(null)
    try {
      let result: AgentPersonalityProfileRecord | null
      if (isEdit && initial) {
        result = await agentWorkspaceService.updatePersonalityProfile(
          initial.id,
          state
        )
      } else {
        result = await agentWorkspaceService.createPersonalityProfile({
          ai_lenser_id: aiLenserId,
          ...state,
        })
      }
      if (result) onSaved?.(result)
      onClose()
    } catch (err) {
      setError((err as Error).message ?? 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="w-[560px]"
      title={isEdit ? 'Edit personality' : 'Add personality profile'}
      headerExtra={
        <DrawerDocsLink
          path="/how-to/agents/workspace/drawers/personality-profile"
          tip="Define a named behavioral preset. Multiple profiles can coexist — only one is active at a time. The active profile's system_prompt_patch is appended verbatim to the agent's system prompt on every run."
        />
      }
      footer={
        <DrawerFooter
          onCancel={onClose}
          onSubmit={handleSave}
          submitLabel={submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
          isLoading={submitting}
          disabled={submitting}
        />
      }
    >
      <div className="space-y-4">
        <FieldLabel
          label="Name"
          tooltip="A label for this personality variant. Use descriptive names like 'Formal analyst' or 'Creative assistant' to distinguish profiles."
        >
          <input
            value={state.name}
            onChange={(e) => setState({ ...state, name: e.target.value })}
            className={inputClass}
          />
        </FieldLabel>

        <div className="grid grid-cols-2 gap-3">
          <Selector
            label="Tone"
            tooltip="Affects phrasing and assertiveness in every response. 'Decisive' skips hedging; 'Reserved' adds more caveats."
            value={state.tone}
            onChange={(v) => setState({ ...state, tone: v })}
            options={TONES}
          />
          <Selector
            label="Expertise"
            tooltip="Models how the agent frames explanations — 'novice' uses plain language; 'principal' assumes deep domain knowledge."
            value={state.expertise_level}
            onChange={(v) => setState({ ...state, expertise_level: v })}
            options={EXPERTISE}
          />
          <Selector
            label="Risk"
            tooltip="'Conservative' avoids uncertain actions; 'aggressive' accepts higher-variance bets."
            value={state.risk_tolerance}
            onChange={(v) => setState({ ...state, risk_tolerance: v })}
            options={RISK}
          />
          <Selector
            label="Autonomy"
            tooltip="'Observed' emits approval requests for every action; 'autonomous' runs without gates within the assigned budget."
            value={state.autonomy_level}
            onChange={(v) => setState({ ...state, autonomy_level: v })}
            options={AUTONOMY}
          />
          <Selector
            label="Communication"
            tooltip="'Concise' outputs minimal text; 'explanatory' adds rationale and context to every response."
            value={state.communication_style}
            onChange={(v) => setState({ ...state, communication_style: v })}
            options={COMMUNICATION}
          />
          <Selector
            label="Decision"
            tooltip="'Evidence-first' delays output until reasoning is complete; 'speed-first' prioritizes throughput over completeness."
            value={state.decision_style}
            onChange={(v) => setState({ ...state, decision_style: v })}
            options={DECISION}
          />
        </div>

        <Selector
          label="Escalation behavior"
          tooltip="When the agent hits a blocker — 'ask_when_blocked' pauses and prompts the owner; 'never' fails silently; 'always_for_writes' gates every write action."
          value={state.escalation_behavior}
          onChange={(v) => setState({ ...state, escalation_behavior: v })}
          options={ESCALATION}
        />

        <FieldLabel
          label="System prompt patch"
          tooltip="Appended verbatim to the agent's system prompt when this profile is active. Avoid duplicating instructions already in the workflow. Max effect with 1–3 focused sentences."
        >
          <textarea
            rows={4}
            value={state.system_prompt_patch}
            onChange={(e) =>
              setState({ ...state, system_prompt_patch: e.target.value })
            }
            className={`${inputClass} resize-none`}
          />
        </FieldLabel>

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </p>
        )}
      </div>
    </Drawer>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-yellow-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const FieldLabel: React.FC<{
  label: string
  tooltip?: string
  children: React.ReactNode
}> = ({ label, tooltip, children }) => (
  <div className="block">
    <div className="mb-1 flex items-center gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
        {label}
      </span>
      {tooltip && (
        <Tooltip content={tooltip} position="top" contentClassName="max-w-xs whitespace-normal text-left">
          <HelpCircle
            size={12}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            aria-label={`${label} — help`}
          />
        </Tooltip>
      )}
    </div>
    {children}
  </div>
)

const Selector: React.FC<{
  label: string
  tooltip?: string
  value: string
  onChange: (v: string) => void
  options: string[]
}> = ({ label, tooltip, value, onChange, options }) => (
  <FieldLabel label={label} tooltip={tooltip}>
    <SelectField
      value={value}
      onChange={onChange}
      options={options.map((o) => ({ value: o, label: o }))}
    />
  </FieldLabel>
)
