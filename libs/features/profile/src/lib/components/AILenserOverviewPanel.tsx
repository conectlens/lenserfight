import { Badge } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Bot, Brain, Clock3, FileText, GitBranch } from 'lucide-react'
import React from 'react'

import type { AgentProfileView, WorkflowRecord } from '@lenserfight/data/repositories'
import type { AIModel, AgentLensBindingRecord, AgentModelBindingRecord, LensViewModel, WorkflowScheduleRecord } from '@lenserfight/types'

interface AILenserOverviewPanelProps {
  agent: AgentProfileView
  lenses: LensViewModel[]
  lensBindings: AgentLensBindingRecord[]
  modelBindings: AgentModelBindingRecord[]
  models: AIModel[]
  workflows: WorkflowRecord[]
  schedules: WorkflowScheduleRecord[]
  selectedModelId: string
  onSelectModel: (modelId: string) => void
  isSavingModel?: boolean
}

function resolveDefaultLens(
  lenses: LensViewModel[],
  bindings: AgentLensBindingRecord[]
): LensViewModel | null {
  const binding = bindings.find((item) => item.is_default) ?? null
  return binding ? lenses.find((lens) => lens.id === binding.lens_id) ?? null : null
}

function resolveDefaultModel(
  models: AIModel[],
  bindings: AgentModelBindingRecord[]
): AIModel | null {
  const binding = bindings.find((item) => item.is_default) ?? null
  return binding ? models.find((model) => model.id === binding.model_id) ?? null : null
}

export const AILenserOverviewPanel: React.FC<AILenserOverviewPanelProps> = ({
  agent,
  lenses,
  lensBindings,
  modelBindings,
  models,
  workflows,
  schedules,
  selectedModelId,
  onSelectModel,
  isSavingModel = false,
}) => {
  const defaultLens = resolveDefaultLens(lenses, lensBindings)
  const defaultModel = resolveDefaultModel(models, modelBindings)
  const activeSchedules = schedules.filter((schedule) => schedule.is_active).length
  const recentDispatch = schedules.find((schedule) => schedule.last_dispatch_status)?.last_dispatch_status ?? 'idle'

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-primary-yellow-500/25 bg-gradient-to-br from-gray-950 via-gray-900 to-primary-yellow-900/70 p-6 text-white">
        <div className="mb-3 flex items-center gap-2">
          <Badge color="yellow">AI Workspace Panel</Badge>
          <Badge color="gray" variant="outline" className="border-white/20 text-white/80">
            Beta
          </Badge>
        </div>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Bot size={22} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">{agent.display_name} automation workspace</h2>
            <p className="max-w-3xl text-sm text-white/80">
              This owner-only panel controls the AI lenser runtime, main lens, default model, connected workflows, and the execution surfaces that can run automatically.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <Brain size={16} />
            Main Lens
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {defaultLens?.title ?? 'Not configured'}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {lensBindings.length} connected lens binding{lensBindings.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <Bot size={16} />
            Default Model
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {defaultModel?.name ?? 'Not configured'}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {modelBindings.length} available model binding{modelBindings.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <GitBranch size={16} />
            Workflows
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{workflows.length}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {activeSchedules} active schedule{activeSchedules === 1 ? '' : 's'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <Clock3 size={16} />
            Scheduler
          </div>
          <p className="text-lg font-semibold capitalize text-gray-900 dark:text-white">
            {recentDispatch.replace(/_/g, ' ')}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Loop-safe dispatch with overlap protection
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <Clock3 size={16} className="text-primary-yellow-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">How automation works</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <GitBranch size={14} className="text-primary-yellow-600" />
              Workflows
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Define <em>what</em> runs. Pure execution graphs — independent of agents and schedules.
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Clock3 size={14} className="text-primary-yellow-600" />
              Schedules
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Define <em>when</em> something runs. Scheduled triggers control when each workflow executes automatically.
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Bot size={14} className="text-primary-yellow-600" />
              Agent Context
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Defines <em>under what constraints</em> execution happens. This agent profile provides policy limits, quotas, and attribution — not initiation.
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          Automation is triggered by scheduled rules, not by the agent profile itself. The agent provides the execution environment.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <Brain size={16} className="text-primary-yellow-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Runtime defaults</h3>
          </div>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <p>
              Runtime preference: <span className="font-medium capitalize text-gray-900 dark:text-white">{agent.runtime_pref}</span>
            </p>
            <p>
              Model binding mode: <span className="font-medium capitalize text-gray-900 dark:text-white">{agent.model_binding_mode}</span>
            </p>
            <p>
              Main instruction source: <span className="font-medium text-gray-900 dark:text-white">{defaultLens?.title ?? 'No default lens selected'}</span>
            </p>
            <p>
              Default execution model: <span className="font-medium text-gray-900 dark:text-white">{defaultModel?.name ?? 'No default model selected'}</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <FileText size={16} className="text-primary-yellow-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Default model binding</h3>
          </div>
          <SelectField
            label="Runtime default model"
            value={selectedModelId}
            onChange={onSelectModel}
            disabled={isSavingModel || models.length === 0}
            options={[
              { value: '', label: 'Select a model' },
              ...models.map((model) => ({ value: model.id, label: model.name })),
            ]}
          />
          <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <p>Every scheduled workflow dispatch is logged in the unified automation feed.</p>
            <p>Schedule activation is blocked for cyclic workflows and in-flight overlap is skipped.</p>
            <p>Main lens and model bindings stay owner-managed and scoped to this AI workspace.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
