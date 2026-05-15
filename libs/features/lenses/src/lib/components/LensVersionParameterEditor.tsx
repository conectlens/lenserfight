import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { CreateVersionParamInput, ToolRecord } from '@lenserfight/types'

const CATEGORY_LABELS: Record<string, string> = {
  input: 'Input',
  media: 'Media',
  execution: 'Execution',
  battle: 'Battle',
  system: 'System',
}

const CATEGORY_ORDER = ['input', 'media', 'execution', 'battle', 'system']

const inputClass =
  'w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500'

interface LensVersionParameterEditorProps {
  parameters: CreateVersionParamInput[]
  tools: ToolRecord[]
  onChange: (params: CreateVersionParamInput[]) => void
}

export const LensVersionParameterEditor: React.FC<LensVersionParameterEditorProps> = ({
  parameters,
  tools,
  onChange,
}) => {
  const handleAdd = () => {
    const defaultToolId = tools.find((t) => t.key === 'text')?.id ?? tools[0]?.id ?? ''
    onChange([...parameters, { label: '', toolId: defaultToolId }])
  }

  const handleRemove = (index: number) => {
    onChange(parameters.filter((_, i) => i !== index))
  }

  const handleLabelChange = (index: number, label: string) => {
    onChange(parameters.map((p, i) => (i === index ? { ...p, label } : p)))
  }

  const handleToolChange = (index: number, toolId: string) => {
    onChange(parameters.map((p, i) => (i === index ? { ...p, toolId } : p)))
  }

  const toolsByCategory = tools.reduce<Record<string, ToolRecord[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {})
  const categories = Object.keys(toolsByCategory).sort(
    (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          Parameters
        </label>
        <Button
          variant="ghost"
          className="!w-auto !p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white"
          onClick={handleAdd}
          type="button"
        >
          <Plus size={14} />
        </Button>
      </div>

      {parameters.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">
          No parameters defined. Variables like {'[[name]]'} will be auto-detected.
        </p>
      ) : (
        <div className="space-y-2">
          {parameters.map((param, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-2.5 py-2"
            >
              {/* Label */}
              <input
                type="text"
                value={param.label}
                onChange={(e) => handleLabelChange(index, e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                placeholder="param_name"
                className={`${inputClass} flex-1 font-mono`}
              />

              {/* Tool selector */}
              <SelectField
                value={param.toolId}
                onChange={(value) => handleToolChange(index, value)}
                options={categories.flatMap((category) =>
                  toolsByCategory[category].map((tool) => ({
                    value: tool.id,
                    label: `${CATEGORY_LABELS[category] ?? category}: ${tool.label ?? tool.key}`,
                  }))
                )}
                className="flex-1"
              />

              {/* Remove */}
              <Button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
