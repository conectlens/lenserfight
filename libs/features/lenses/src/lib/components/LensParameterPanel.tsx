import React, { useMemo, useState, KeyboardEvent } from 'react'
import { paramTokenBracket } from '@lenserfight/domain/lens-parameters'
import { Trash2, X } from 'lucide-react'
import { ParamChip, SearchSelectField } from '@lenserfight/ui/forms'
import { CreateVersionParamInput, ToolRecord } from '@lenserfight/types'

interface ParameterPanelProps {
  versionParams: CreateVersionParamInput[]
  onChange: (params: CreateVersionParamInput[]) => void
  tools: ToolRecord[]
}

const TYPE_BADGE: Record<string, string> = {
  text:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  textarea:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  json:      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  number:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  integer:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  float:     'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  decimal:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  boolean:   'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  select:    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  url:       'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  date:      'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  datetime:  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  file:      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

function makeColorDot(color: string | null): React.FC<{ size?: number }> {
  return function ColorDot({ size = 10 }) {
    return (
      <span
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: '50%',
          background: color ?? '#9ca3af',
          flexShrink: 0,
        }}
      />
    )
  }
}

export const ParameterPanel: React.FC<ParameterPanelProps> = ({
  versionParams,
  onChange,
  tools,
}) => {
  // Per-param in-progress option input (keyed by param index)
  const [optionInputs, setOptionInputs] = useState<Record<number, string>>({})

  const toolOptions = useMemo(
    () =>
      [...tools]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((tool) => ({
          value: tool.id,
          label: tool.label ?? tool.key,
          icon: makeColorDot(tool.color),
        })),
    [tools]
  )

  if (versionParams.length === 0) return null

  const handleDelete = (index: number) => {
    onChange(versionParams.filter((_, i) => i !== index))
  }

  const handleToolChange = (index: number, toolId: string) => {
    const tool = tools.find((t) => t.id === toolId)
    const isSelectType = tool?.type === 'select' || tool?.type === 'multiselect'
    onChange(
      versionParams.map((p, i) =>
        i === index
          ? { ...p, toolId, options: isSelectType ? (p.options ?? []) : undefined }
          : p
      )
    )
  }

  const handleAddOption = (index: number) => {
    const raw = (optionInputs[index] ?? '').trim()
    if (!raw) return
    const existing = versionParams[index].options ?? []
    if (existing.some((o) => o.value === raw)) return
    const updated = [...existing, { label: raw, value: raw }]
    onChange(versionParams.map((p, i) => (i === index ? { ...p, options: updated } : p)))
    setOptionInputs((prev) => ({ ...prev, [index]: '' }))
  }

  const handleRemoveOption = (paramIndex: number, optIndex: number) => {
    const updated = (versionParams[paramIndex].options ?? []).filter((_, j) => j !== optIndex)
    onChange(versionParams.map((p, i) => (i === paramIndex ? { ...p, options: updated } : p)))
  }

  const handleOptionKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddOption(index)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Detected Parameters
      </p>
      <div className="space-y-1.5">
        {versionParams.map((param, i) => {
          const selectedTool = tools.find((t) => t.id === param.toolId)

          const isSelectType = selectedTool?.type === 'select' || selectedTool?.type === 'multiselect'
          const paramOptions = param.options ?? []
          const missingOptions = isSelectType && paramOptions.length === 0

          return (
            <div
              key={`${param.label}-${i}`}
              className="flex flex-col gap-0 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700"
            >
              {/* Main row */}
              <div className="flex items-center gap-2">
                {/* Label + template token */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <ParamChip
                    name={param.label}
                    type={selectedTool?.type}
                    required={param.optional ? false : (selectedTool?.required ?? true)}
                    size="xs"
                  />
                  <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
                    {paramTokenBracket(param.label, !!param.optional, selectedTool?.type)}
                  </span>
                </div>

                {/* Tool selector */}
                <div className="flex-1 min-w-0">
                  <SearchSelectField
                    value={param.toolId}
                    onChange={(id) => handleToolChange(i, id)}
                    options={toolOptions}
                    placeholder="Select tool..."
                    searchPlaceholder="Search tools..."
                  />
                </div>

                {/* Optional badge */}
                {param.optional && (
                  <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-greyscale-100 text-greyscale-500 dark:bg-greyscale-800 dark:text-greyscale-400">
                    optional
                  </span>
                )}

                {/* Type badge */}
                {selectedTool && (
                  <span
                    className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${TYPE_BADGE[selectedTool.type] ?? TYPE_BADGE.text}`}
                  >
                    {selectedTool.type}
                  </span>
                )}

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDelete(i)}
                  className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                  title="Delete parameter"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Options editor — only for select / multiselect */}
              {isSelectType && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mr-0.5">
                      Options
                    </span>
                    {paramOptions.map((opt, j) => (
                      <span
                        key={j}
                        className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 rounded-full text-[11px] font-medium"
                      >
                        {opt.label}
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(i, j)}
                          className="text-teal-400 hover:text-red-500 transition-colors rounded-full"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={optionInputs[i] ?? ''}
                      onChange={(e) =>
                        setOptionInputs((prev) => ({ ...prev, [i]: e.target.value }))
                      }
                      onKeyDown={(e) => handleOptionKeyDown(e, i)}
                      onBlur={() => handleAddOption(i)}
                      placeholder="+ option"
                      className="text-[11px] bg-transparent outline-none text-gray-600 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 min-w-[64px] max-w-[120px]"
                    />
                  </div>
                  {missingOptions && (
                    <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-1">
                      Add at least one option — required before this field can be used.
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
