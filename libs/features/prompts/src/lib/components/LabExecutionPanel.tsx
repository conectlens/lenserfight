import React, { useMemo, useState } from 'react'
import { Loader2, Play } from 'lucide-react'
import { SelectField } from '@lenserfight/ui/forms'
import { Button } from '@lenserfight/ui/components'
import { AIModel, TriggerExecutionDTO, ExecutionRun } from '@lenserfight/types'

const VARIABLE_REGEX = /\{\{(\w+)\}\}/g

function extractVariables(content: string): string[] {
  const matches = new Set<string>()
  let match: RegExpExecArray | null
  const re = new RegExp(VARIABLE_REGEX.source, VARIABLE_REGEX.flags)
  while ((match = re.exec(content)) !== null) {
    matches.add(match[1])
  }
  return Array.from(matches)
}

interface LabExecutionPanelProps {
  promptId: string
  promptContent: string
  aiModels: AIModel[]
  isLoadingModels: boolean
  onTrigger: (dto: TriggerExecutionDTO) => void
  isTriggeringExecution: boolean
  pendingRun: Pick<ExecutionRun, 'id' | 'status'> | null
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'Queued…',
  running: 'Running…',
  succeeded: 'Completed',
  failed: 'Failed',
  canceled: 'Canceled',
  timed_out: 'Timed out',
}

export const LabExecutionPanel: React.FC<LabExecutionPanelProps> = ({
  promptId,
  promptContent,
  aiModels,
  isLoadingModels,
  onTrigger,
  isTriggeringExecution,
  pendingRun,
}) => {
  const variables = useMemo(() => extractVariables(promptContent), [promptContent])

  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [inputValues, setInputValues] = useState<Record<string, string>>({})

  const handleInputChange = (variable: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [variable]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedModelId) return

    const input_snapshot: Record<string, unknown> =
      variables.length > 0
        ? Object.fromEntries(variables.map((v) => [v, inputValues[v] ?? '']))
        : { freeform: inputValues['freeform'] ?? '' }

    onTrigger({
      prompt_template_id: promptId,
      model_id: selectedModelId,
      input_snapshot,
      origin_type: 'forum',
      funding_source: 'platform_credit',
    })
  }

  const isRunning = !!pendingRun && !['succeeded', 'failed', 'canceled', 'timed_out'].includes(pendingRun.status)
  const isDisabled = isTriggeringExecution || isRunning || !selectedModelId

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Run Prompt</h4>
        {pendingRun && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            {isRunning && <Loader2 size={12} className="animate-spin" />}
            {STATUS_LABELS[pendingRun.status] ?? pendingRun.status}
          </span>
        )}
      </div>

      {/* Model Selector */}
      <SelectField
        value={selectedModelId}
        onChange={setSelectedModelId}
        options={[
          { value: '', label: isLoadingModels ? 'Loading models…' : 'Select a model' },
          ...aiModels.map((m) => ({ value: m.id, label: `${m.name} (${m.provider})` })),
        ]}
      />

      {/* Dynamic Variable Inputs */}
      {variables.length > 0 ? (
        <div className="flex flex-col gap-3">
          {variables.map((variable) => (
            <div key={variable} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {variable}
              </label>
              <input
                type="text"
                value={inputValues[variable] ?? ''}
                onChange={(e) => handleInputChange(variable, e.target.value)}
                placeholder={`Enter ${variable}…`}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Input
          </label>
          <textarea
            value={inputValues['freeform'] ?? ''}
            onChange={(e) => handleInputChange('freeform', e.target.value)}
            placeholder="Enter additional context or instructions…"
            rows={3}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>
      )}

      <Button
        type="submit"
        disabled={isDisabled}
        className="w-full flex items-center justify-center gap-2 h-auto py-2.5"
      >
        {isRunning ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>{STATUS_LABELS[pendingRun!.status]}</span>
          </>
        ) : (
          <>
            <Play size={16} />
            <span>Run</span>
          </>
        )}
      </Button>
    </form>
  )
}
