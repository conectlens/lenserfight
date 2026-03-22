import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { PromptVersionParam } from '@lenserfight/types'

type EditableParam = Omit<PromptVersionParam, 'id' | 'versionId'>

const PARAM_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'select', label: 'Select' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'json', label: 'JSON' },
]

const inputClass =
  'w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500'

interface VersionParameterEditorProps {
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

export const VersionParameterEditor: React.FC<VersionParameterEditorProps> = ({
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
    updated[index] = { ...updated[index], [field]: value }
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
          {parameters.map((param, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-2 items-start p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50"
            >
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
          ))}
        </div>
      )}
    </div>
  )
}
