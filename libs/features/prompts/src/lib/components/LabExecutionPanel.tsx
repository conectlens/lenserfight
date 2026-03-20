import React, { useMemo, useState } from 'react'
import { Loader2, Play } from 'lucide-react'
import { SelectField } from '@lenserfight/ui/forms'
import { Button, FormError } from '@lenserfight/ui/components'
import { AIModel, PromptParam } from '@lenserfight/types'
import { validateParamValues } from '@lenserfight/utils/text'
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
  params?: PromptParam[]
}

const inputClass =
  'w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500'

export const LabExecutionPanel: React.FC<LabExecutionPanelProps> = ({
  promptId: _promptId,
  promptContent,
  aiModels,
  isLoadingModels,
  onTrigger,
  isTriggeringExecution,
  params,
}) => {
  const variables = useMemo(() => extractVariables(promptContent), [promptContent])

  // Derive typed schema: use props.params when available, fall back to legacy string extraction
  const paramSchemas = useMemo<PromptParam[]>(() => {
    if (params && params.length > 0) return params
    return variables.map((v) => ({ name: v, type: 'string' as const, required: true, placeholder: `Enter ${v}…` }))
  }, [params, variables])

  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [inputValues, setInputValues] = useState<Record<string, any>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleChange = (name: string, value: any) => {
    setInputValues((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => { const next = { ...prev }; delete next[name]; return next })
  }

  const handleMultiselectToggle = (name: string, option: string) => {
    setInputValues((prev) => {
      const current: string[] = Array.isArray(prev[name]) ? prev[name] : []
      const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option]
      return { ...prev, [name]: next }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedModelId) return

    const model = aiModels.find((m) => m.slug === selectedModelId)
    if (!model) return

    if (paramSchemas.length > 0) {
      const errors = validateParamValues(inputValues, paramSchemas)
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }
    }

    const inputSnapshot: Record<string, any> =
      paramSchemas.length > 0
        ? Object.fromEntries(paramSchemas.map((p) => [p.name, inputValues[p.name] ?? p.default ?? '']))
        : { freeform: inputValues['freeform'] ?? '' }

    onTrigger({ model, promptContent, inputSnapshot, params: paramSchemas })
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

      {/* Typed Parameter Inputs */}
      {paramSchemas.length > 0 ? (
        <div className="flex flex-col gap-3">
          {paramSchemas.map((param) => (
            <div key={param.name} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {param.name}
                {param.required && <span className="text-red-500 ml-0.5">*</span>}
                {param.description && (
                  <span className="ml-1 normal-case text-gray-400 font-normal">— {param.description}</span>
                )}
              </label>

              {(param.type === 'string' || param.type === 'number') && (
                <input
                  type={param.type === 'number' ? 'number' : 'text'}
                  value={inputValues[param.name] ?? param.default ?? ''}
                  onChange={(e) => handleChange(param.name, e.target.value)}
                  placeholder={param.placeholder ?? `Enter ${param.name}…`}
                  min={param.min}
                  max={param.max}
                  className={inputClass}
                />
              )}

              {param.type === 'boolean' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!inputValues[param.name]}
                    onChange={(e) => handleChange(param.name, e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{param.name}</span>
                </label>
              )}

              {param.type === 'select' && (
                <SelectField
                  value={inputValues[param.name] ?? param.default ?? ''}
                  onChange={(val) => handleChange(param.name, val)}
                  placeholder={`Select ${param.name}…`}
                  options={param.options ?? []}
                />
              )}

              {param.type === 'multiselect' && param.options && (
                <div className="flex flex-wrap gap-2">
                  {param.options.map((opt) => {
                    const selected: string[] = Array.isArray(inputValues[param.name]) ? inputValues[param.name] : []
                    const isChecked = selected.includes(opt.value)
                    return (
                      <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleMultiselectToggle(param.name, opt.value)}
                          className="w-3.5 h-3.5 accent-primary"
                        />
                        <span className="text-gray-700 dark:text-gray-300">{opt.label}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {param.type === 'array' && (
                <textarea
                  value={inputValues[param.name] ?? param.default ?? ''}
                  onChange={(e) => handleChange(param.name, e.target.value)}
                  placeholder={
                    param.arrayFormat === 'json'
                      ? '["item1", "item2"]'
                      : param.arrayFormat === 'newline'
                      ? 'item1\nitem2\nitem3'
                      : 'item1, item2, item3'
                  }
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              )}

              {fieldErrors[param.name] && <FormError message={fieldErrors[param.name]} />}
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
            onChange={(e) => handleChange('freeform', e.target.value)}
            placeholder="Enter additional context or instructions…"
            rows={3}
            className={`${inputClass} resize-none`}
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
