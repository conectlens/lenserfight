import React from 'react'
import { SelectField } from '@lenserfight/ui/forms'
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
  'w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all'

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

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Detected Parameters
      </p>
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[140px_140px_70px_1fr] gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</span>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</span>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Req.</span>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Default / Options</span>
        </div>

        {/* Rows */}
        {params.map((param, i) => (
          <div
            key={param.name}
            className="grid grid-cols-[140px_140px_70px_1fr] gap-2 px-3 py-2 border-b last:border-b-0 border-gray-100 dark:border-gray-700 items-start"
          >
            {/* Name */}
            <div className="flex items-center h-8">
              <code className="text-xs font-mono text-primary-700 dark:text-primary-400 truncate">
                {`{{${param.name}}}`}
              </code>
            </div>

            {/* Type */}
            <div>
              <SelectField
                value={param.type}
                onChange={(val) => onChange(updateParam(params, i, { type: val as LensParamType, options: undefined, arrayFormat: undefined }))}
                options={PARAM_TYPES}
                className="w-full"
              />
            </div>

            {/* Required */}
            <div className="flex items-center justify-center h-8">
              <input
                type="checkbox"
                checked={param.required}
                onChange={(e) => onChange(updateParam(params, i, { required: e.target.checked }))}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>

            {/* Default / Options / ArrayFormat */}
            <div className="space-y-1.5">
              {param.type !== 'boolean' && param.type !== 'select' && param.type !== 'multiselect' && param.type !== 'array' && (
                <input
                  type="text"
                  value={param.default ?? ''}
                  onChange={(e) => onChange(updateParam(params, i, { default: e.target.value || undefined }))}
                  placeholder="Default value"
                  className={inputClass}
                />
              )}

              {param.type === 'boolean' && (
                <SelectField
                  value={param.default ?? ''}
                  onChange={(val) => onChange(updateParam(params, i, { default: val || undefined }))}
                  options={[{ value: '', label: 'No default' }, { value: 'true', label: 'true' }, { value: 'false', label: 'false' }]}
                  className="w-full"
                />
              )}

              {(param.type === 'select' || param.type === 'multiselect') && (
                <input
                  type="text"
                  value={optionsToString(param.options)}
                  onChange={(e) => onChange(updateParam(params, i, { options: parseOptions(e.target.value) }))}
                  placeholder="label:value, label2:value2"
                  className={inputClass}
                />
              )}

              {param.type === 'array' && (
                <SelectField
                  value={param.arrayFormat ?? 'comma'}
                  onChange={(val) => onChange(updateParam(params, i, { arrayFormat: val as LensParam['arrayFormat'] }))}
                  options={ARRAY_FORMATS}
                  className="w-full"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
