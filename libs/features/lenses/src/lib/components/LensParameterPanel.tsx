import React from 'react'
import { Trash2 } from 'lucide-react'
import { SelectField } from '@lenserfight/ui/forms'
import { ParamChip } from '@lenserfight/ui/forms'
import { Accordion } from '@lenserfight/ui/components'
import { LensParam, LensParamType } from '@lenserfight/types'

interface ParameterPanelProps {
  params: LensParam[]
  onChange: (params: LensParam[]) => void
}

const PARAM_TYPES: { value: LensParamType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'select', label: 'Select' },
  { value: 'multiselect', label: 'Multi-Select' },
  { value: 'array', label: 'Array' },
]

const ARRAY_FORMATS = [
  { value: 'comma', label: 'Comma-separated' },
  { value: 'newline', label: 'Newline-separated' },
  { value: 'json', label: 'JSON array' },
]

const inputClass =
  'w-full px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all'

function updateParam(params: LensParam[], index: number, patch: Partial<LensParam>): LensParam[] {
  return params.map((p, i) => (i === index ? { ...p, ...patch } : p))
}

function parseOptions(raw: string): { label: string; value: string }[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [label, value] = s.split(':').map((p) => p.trim())
      return { label: label ?? s, value: value ?? label ?? s }
    })
}

function optionsToString(options: { label: string; value: string }[] | undefined): string {
  return (options ?? []).map((o) => (o.label === o.value ? o.value : `${o.label}:${o.value}`)).join(', ')
}

export const ParameterPanel: React.FC<ParameterPanelProps> = ({ params, onChange }) => {
  if (params.length === 0) return null

  const handleDelete = (index: number) => {
    onChange(params.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Detected Parameters
      </p>
      <Accordion type="multiple">
        {params.map((param, i) => (
          <Accordion.Item
            key={`${param.name}-${i}`}
            title={`[[${param.name}]]`}
            icon={
              <ParamChip
                name={param.name}
                type={param.type}
                required={param.required}
                size="xs"
                draggable
              />
            }
            actions={
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDelete(i) }}
                className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Delete parameter"
              >
                <Trash2 size={12} />
              </button>
            }
          >
            <div className="space-y-3 pt-1">
              {/* Type + Required row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </label>
                  <SelectField
                    value={param.type}
                    onChange={(val) =>
                      onChange(updateParam(params, i, {
                        type: val as LensParamType,
                        options: undefined,
                        arrayFormat: undefined,
                      }))
                    }
                    options={PARAM_TYPES}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Required
                  </label>
                  <div className="flex items-center h-8">
                    <input
                      type="checkbox"
                      checked={param.required}
                      onChange={(e) => onChange(updateParam(params, i, { required: e.target.checked }))}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {param.required ? 'Required' : 'Optional'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Default / Options */}
              {param.type !== 'boolean' && param.type !== 'select' && param.type !== 'multiselect' && param.type !== 'array' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Default Value
                  </label>
                  <input
                    type="text"
                    value={param.default ?? ''}
                    onChange={(e) => onChange(updateParam(params, i, { default: e.target.value || undefined }))}
                    placeholder="Default value"
                    className={inputClass}
                  />
                </div>
              )}

              {param.type === 'boolean' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Default Value
                  </label>
                  <SelectField
                    value={param.default ?? ''}
                    onChange={(val) => onChange(updateParam(params, i, { default: val || undefined }))}
                    options={[
                      { value: '', label: 'No default' },
                      { value: 'true', label: 'true' },
                      { value: 'false', label: 'false' },
                    ]}
                    className="w-full"
                  />
                </div>
              )}

              {(param.type === 'select' || param.type === 'multiselect') && (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Options (label:value)
                  </label>
                  <input
                    type="text"
                    value={optionsToString(param.options)}
                    onChange={(e) => onChange(updateParam(params, i, { options: parseOptions(e.target.value) }))}
                    placeholder="label:value, label2:value2"
                    className={inputClass}
                  />
                </div>
              )}

              {param.type === 'array' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Array Format
                  </label>
                  <SelectField
                    value={param.arrayFormat ?? 'comma'}
                    onChange={(val) =>
                      onChange(updateParam(params, i, { arrayFormat: val as LensParam['arrayFormat'] }))
                    }
                    options={ARRAY_FORMATS}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
}
