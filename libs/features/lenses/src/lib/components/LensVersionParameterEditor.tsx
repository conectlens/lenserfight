import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { LensVersionParam, LensVersionParamType } from '@lenserfight/types'

type EditableParam = Omit<LensVersionParam, 'id' | 'versionId'>

const PARAM_TYPES: { value: LensVersionParamType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'json', label: 'JSON' },
  { value: 'number', label: 'Number (legacy)' },
  { value: 'integer', label: 'Integer' },
  { value: 'float', label: 'Float' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'select', label: 'Select' },
  { value: 'url', label: 'URL' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Datetime' },
  { value: 'file', label: 'File / Attachment' },
]

const NUMERIC_TYPES: LensVersionParamType[] = ['integer', 'float', 'decimal', 'number']

const inputClass =
  'w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500'

interface LensVersionParameterEditorProps {
  parameters: EditableParam[]
  onChange: (params: EditableParam[]) => void
}

const makeEmptyParam = (sortOrder: number): EditableParam => ({
  key: '',
  label: '',
  type: 'text',
  required: false,
  defaultValue: null,
  placeholder: null,
  helpText: null,
  validationSchema: null,
  options: undefined,
  sortOrder,
})

function updateValidationSchema(
  param: EditableParam,
  patch: Partial<NonNullable<EditableParam['validationSchema']>>,
): EditableParam['validationSchema'] {
  return { ...(param.validationSchema ?? {}), ...patch }
}

export const LensVersionParameterEditor: React.FC<LensVersionParameterEditorProps> = ({
  parameters,
  onChange,
}) => {
  const handleAdd = () => {
    onChange([...parameters, makeEmptyParam(parameters.length)])
  }

  const handleRemove = (index: number) => {
    onChange(parameters.filter((_, i) => i !== index))
  }

  const handleFieldChange = (index: number, field: keyof EditableParam, value: unknown) => {
    const updated = [...parameters]
    // When type changes, reset validation schema to avoid stale constraints
    if (field === 'type') {
      updated[index] = { ...updated[index], [field]: value as LensVersionParamType, validationSchema: null }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    onChange(updated)
  }

  const handleSchemaField = (
    index: number,
    schemaKey: keyof NonNullable<EditableParam['validationSchema']>,
    rawValue: string,
  ) => {
    const param = parameters[index]
    const updated = [...parameters]
    if (schemaKey === 'allowedMimeTypes') {
      const mimes = rawValue
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      updated[index] = {
        ...param,
        validationSchema: updateValidationSchema(param, { allowedMimeTypes: mimes.length ? mimes : null }),
        allowedMimeTypes: mimes.length ? mimes : null,
      }
    } else if (schemaKey === 'urlScheme') {
      const schemes = rawValue
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      updated[index] = {
        ...param,
        validationSchema: updateValidationSchema(param, { urlScheme: schemes.length ? schemes : null }),
      }
    } else {
      const numVal = rawValue === '' ? null : Number(rawValue)
      updated[index] = {
        ...param,
        validationSchema: updateValidationSchema(param, { [schemaKey]: numVal }),
        ...(schemaKey === 'min' ? { min: numVal } : {}),
        ...(schemaKey === 'max' ? { max: numVal } : {}),
      }
    }
    onChange(updated)
  }

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
          No parameters defined. Variables like {'{{name}}'} will be auto-detected.
        </p>
      ) : (
        <div className="space-y-3">
          {parameters.map((param, index) => {
            const isNumeric = NUMERIC_TYPES.includes(param.type)
            const isFile = param.type === 'file'
            const isUrl = param.type === 'url'

            return (
              <div
                key={index}
                className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-2.5 space-y-2"
              >
                {/* Row 1: key, label, type, required, default, remove */}
                <div className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={param.key}
                      onChange={(e) => handleFieldChange(index, 'key', e.target.value)}
                      placeholder="key"
                      className={inputClass}
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={param.label ?? ''}
                      onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                      placeholder="Label"
                      className={inputClass}
                    />
                  </div>
                  <div className="col-span-2">
                    <SelectField
                      value={param.type}
                      onChange={(val) => handleFieldChange(index, 'type', val)}
                      options={PARAM_TYPES}
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center pt-1">
                    <label className="flex items-center cursor-pointer" title="Required">
                      <input
                        type="checkbox"
                        checked={param.required}
                        onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                        className="w-3.5 h-3.5 accent-primary"
                      />
                    </label>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={param.defaultValue ?? ''}
                      onChange={(e) => handleFieldChange(index, 'defaultValue', e.target.value || null)}
                      placeholder="Default"
                      className={inputClass}
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Row 2: Numeric constraints */}
                {isNumeric && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={param.validationSchema?.min ?? ''}
                      onChange={(e) => handleSchemaField(index, 'min', e.target.value)}
                      placeholder="Min"
                      className={inputClass}
                    />
                    <input
                      type="number"
                      value={param.validationSchema?.max ?? ''}
                      onChange={(e) => handleSchemaField(index, 'max', e.target.value)}
                      placeholder="Max"
                      className={inputClass}
                    />
                  </div>
                )}

                {/* Row 2: URL scheme allowlist */}
                {isUrl && (
                  <input
                    type="text"
                    value={(param.validationSchema?.urlScheme ?? ['https']).join(', ')}
                    onChange={(e) => handleSchemaField(index, 'urlScheme', e.target.value)}
                    placeholder="Allowed schemes: https, http"
                    className={inputClass}
                  />
                )}

                {/* Row 2: File MIME types */}
                {isFile && (
                  <input
                    type="text"
                    value={(param.allowedMimeTypes ?? []).join(', ')}
                    onChange={(e) => handleSchemaField(index, 'allowedMimeTypes', e.target.value)}
                    placeholder="Allowed MIME types: image/png, application/pdf"
                    className={inputClass}
                  />
                )}

                {/* Row 2: Select options */}
                {param.type === 'select' && (
                  <input
                    type="text"
                    value={(param.options ?? []).map((o) => `${o.label}:${o.value}`).join(', ')}
                    onChange={(e) => {
                      const opts = e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((s) => {
                          const [label, value] = s.split(':')
                          return { label: label.trim(), value: (value ?? label).trim() }
                        })
                      handleFieldChange(index, 'options', opts)
                    }}
                    placeholder="Options: Label:value, Other:other"
                    className={inputClass}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
