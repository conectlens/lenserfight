import React, { useMemo } from 'react'
import { Trash2 } from 'lucide-react'
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
  if (versionParams.length === 0) return null

  const handleDelete = (index: number) => {
    onChange(versionParams.filter((_, i) => i !== index))
  }

  const handleToolChange = (index: number, toolId: string) => {
    onChange(versionParams.map((p, i) => (i === index ? { ...p, toolId } : p)))
  }

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

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Detected Parameters
      </p>
      <div className="space-y-1.5">
        {versionParams.map((param, i) => {
          const selectedTool = tools.find((t) => t.id === param.toolId)

          return (
            <div
              key={`${param.label}-${i}`}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700"
            >
              {/* Label chip */}
              <ParamChip
                name={param.label}
                type={selectedTool?.type}
                required={selectedTool?.required ?? true}
                size="xs"
              />

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
          )
        })}
      </div>
    </div>
  )
}
