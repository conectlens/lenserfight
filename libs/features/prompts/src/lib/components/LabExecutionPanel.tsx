import React, { useMemo, useState } from 'react'
import { Loader2, Play } from 'lucide-react'
import { SelectField } from '@lenserfight/ui/forms'
import { Button } from '@lenserfight/ui/components'
import { AIModel } from '@lenserfight/types'
import { TriggerLabExecutionDTO } from '../hooks/useLabController'

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
  onTrigger: (dto: TriggerLabExecutionDTO) => void
  isTriggeringExecution: boolean
  pendingRun?: null
}

export const LabExecutionPanel: React.FC<LabExecutionPanelProps> = ({
  promptId: _promptId,
  promptContent,
  aiModels,
  isLoadingModels,
  onTrigger,
  isTriggeringExecution,
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

    const model = aiModels.find((m) => m.slug === selectedModelId)
    if (!model) return

    const inputSnapshot: Record<string, string> =
      variables.length > 0
        ? Object.fromEntries(variables.map((v) => [v, inputValues[v] ?? '']))
        : { freeform: inputValues['freeform'] ?? '' }

    onTrigger({ model, promptContent, inputSnapshot })
  }

  const isDisabled = isTriggeringExecution || !selectedModelId

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Run Prompt</h4>
        {isTriggeringExecution && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Loader2 size={12} className="animate-spin" />
            Running…
          </span>
        )}
      </div>

      {/* Model Selector */}
      <SelectField
        value={selectedModelId}
        onChange={setSelectedModelId}
        placeholder={isLoadingModels ? 'Loading models…' : 'Select a model'}
        options={aiModels.map((m) => ({ value: m.slug, label: `${m.name} (${m.provider})` }))}
        disabled={isLoadingModels}
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
        {isTriggeringExecution ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Running…</span>
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
