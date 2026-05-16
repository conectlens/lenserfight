import React from 'react'
import { SelectField } from '@lenserfight/ui/forms'
import { FormError } from '@lenserfight/ui/components'
import { LensParam } from '@lenserfight/types'

const inputClass =
  'w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500'

interface LegacyParamFieldsProps {
  params: LensParam[]
  values: Record<string, unknown>
  errors: Record<string, string>
  onChange: (name: string, value: unknown) => void
  onMultiselectToggle: (name: string, option: string) => void
}

export const LegacyParamFields: React.FC<LegacyParamFieldsProps> = ({
  params,
  values,
  errors,
  onChange,
  onMultiselectToggle,
}) => {
  return (
    <>
      {params.map((param) => (
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
              value={(values[param.name] as string) ?? param.default ?? ''}
              onChange={(e) => onChange(param.name, e.target.value)}
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
                checked={!!values[param.name]}
                onChange={(e) => onChange(param.name, e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{param.name}</span>
            </label>
          )}

          {param.type === 'select' && (
            <SelectField
              value={(values[param.name] as string) ?? param.default ?? ''}
              onChange={(val) => onChange(param.name, val)}
              placeholder={`Select ${param.name}…`}
              options={param.options ?? []}
            />
          )}

          {param.type === 'multiselect' && param.options && (
            <div className="flex flex-wrap gap-2">
              {param.options.map((opt) => {
                const selected: string[] = Array.isArray(values[param.name]) ? (values[param.name] as string[]) : []
                return (
                  <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.includes(opt.value)}
                      onChange={() => onMultiselectToggle(param.name, opt.value)}
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
              value={(values[param.name] as string) ?? param.default ?? ''}
              onChange={(e) => onChange(param.name, e.target.value)}
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

          {errors[param.name] && <FormError message={errors[param.name]} />}
        </div>
      ))}
    </>
  )
}
