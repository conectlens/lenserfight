/**
 * SchemaBuilderField — form-based schema builder that replaces raw JSON textarea.
 *
 * Users can add/remove/reorder fields through a visual form instead of writing JSON.
 * An advanced toggle reveals the generated JSON schema for developers.
 *
 * Design:
 * - GRASP Information Expert: owns field list manipulation and validation.
 * - Reuses @lenserfight/ui primitives (Input, SelectField, Button, Tooltip).
 */

import { Button } from '@lenserfight/ui/components'
import { Input, SelectField } from '@lenserfight/ui/forms'
import {
  ChevronDown,
  ChevronUp,
  Code2,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'

import { WorkflowExpressionInput } from '../../components/WorkflowExpressionInput'
import {
  deserializeSchemaFields,
  schemaFieldsToJsonSchema,
  serializeSchemaFields,
  validateSchemaFields,
} from './schema-parser'

import type { SchemaFieldEntry, SchemaFieldType } from '../../types'

// ── Constants ──────────────────────────────────────────────────────────────

const FIELD_TYPE_OPTIONS: Array<{ value: SchemaFieldType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'long_text', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'select', label: 'Select' },
  { value: 'multi_select', label: 'Multi-Select' },
  { value: 'json', label: 'JSON / Object' },
  { value: 'array', label: 'Array' },
  { value: 'file', label: 'File' },
  { value: 'image', label: 'Image' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'url', label: 'URL' },
  { value: 'datetime', label: 'Date/Time' },
]

// ── Props ──────────────────────────────────────────────────────────────────

export interface SchemaBuilderFieldProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  allowedTypes?: SchemaFieldType[]
  /** Label for the output preview section */
  outputPreviewLabel?: string
}

// ── Component ──────────────────────────────────────────────────────────────

let fieldIdCounter = 0
function createEmptyField(): SchemaFieldEntry {
  return {
    id: `new_${Date.now()}_${fieldIdCounter++}`,
    name: '',
    type: 'text',
    required: false,
    defaultValue: '',
    description: '',
    example: '',
  }
}

export function SchemaBuilderField({
  value,
  onChange,
  onBlur,
  error,
  allowedTypes,
  outputPreviewLabel = 'Output Contract Preview',
}: SchemaBuilderFieldProps) {
  // Parse existing value into fields — if unparseable, show raw mode
  const [rawMode, setRawMode] = useState<boolean>(() => {
    if (!value.trim()) return false
    return deserializeSchemaFields(value) === null
  })

  const [fields, setFields] = useState<SchemaFieldEntry[]>(() => {
    if (!value.trim()) return []
    return deserializeSchemaFields(value) ?? []
  })

  const [showAdvanced, setShowAdvanced] = useState(false)

  const validationErrors = useMemo(() => validateSchemaFields(fields), [fields])
  const errorsByIndex = useMemo(() => {
    const map = new Map<number, string[]>()
    for (const e of validationErrors) {
      const list = map.get(e.fieldIndex) ?? []
      list.push(e.message)
      map.set(e.fieldIndex, list)
    }
    return map
  }, [validationErrors])

  const typeOptions = useMemo(() => {
    if (!allowedTypes || allowedTypes.length === 0) return FIELD_TYPE_OPTIONS
    return FIELD_TYPE_OPTIONS.filter((o) => allowedTypes.includes(o.value))
  }, [allowedTypes])

  // Sync fields → serialized value
  const syncValue = useCallback(
    (updated: SchemaFieldEntry[]) => {
      setFields(updated)
      onChange(serializeSchemaFields(updated))
    },
    [onChange],
  )

  const addField = () => syncValue([...fields, createEmptyField()])

  const removeField = (idx: number) => {
    const next = fields.filter((_, i) => i !== idx)
    syncValue(next)
  }

  const moveField = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= fields.length) return
    const next = [...fields]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    syncValue(next)
  }

  const updateField = (idx: number, patch: Partial<SchemaFieldEntry>) => {
    const next = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f))
    syncValue(next)
  }

  // Raw mode: fallback for unparseable legacy schemas
  if (rawMode) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
            Advanced: Raw JSON Schema (could not auto-convert to form builder)
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const parsed = deserializeSchemaFields(value)
              if (parsed) {
                setFields(parsed)
                setRawMode(false)
              }
            }}
            className="!h-5 !px-2 text-[10px]"
          >
            Try Form Mode
          </Button>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          rows={8}
          className="w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 font-mono text-xs text-greyscale-700 dark:text-greyscale-200 focus:ring-1 focus:ring-primary-yellow-500 resize-y"
          placeholder='{"type":"object","properties":{},"required":[]}'
        />
        {error && <p className="text-[10px] text-status-red">{error}</p>}
      </div>
    )
  }

  const generatedSchema = schemaFieldsToJsonSchema(fields)

  return (
    <div className="space-y-3" onBlur={onBlur}>
      {/* Field list */}
      {fields.map((field, idx) => {
        const fieldErrors = errorsByIndex.get(idx)
        return (
          <div
            key={field.id}
            className={`rounded-xl border p-3 space-y-2 ${
              fieldErrors ? 'border-status-red/30 bg-status-red/5' : 'border-surface-border bg-surface-raised'
            }`}
          >
            {/* Field header row */}
            <div className="flex items-center gap-1.5">
              <GripVertical size={12} className="text-greyscale-400 flex-shrink-0" />
              <span className="text-[10px] font-medium text-greyscale-400 flex-shrink-0">
                #{idx + 1}
              </span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => moveField(idx, -1)}
                disabled={idx === 0}
                className="p-0.5 text-greyscale-400 hover:text-greyscale-600 disabled:opacity-30"
                title="Move up"
              >
                <ChevronUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => moveField(idx, 1)}
                disabled={idx === fields.length - 1}
                className="p-0.5 text-greyscale-400 hover:text-greyscale-600 disabled:opacity-30"
                title="Move down"
              >
                <ChevronDown size={12} />
              </button>
              <button
                type="button"
                onClick={() => removeField(idx)}
                className="p-0.5 text-greyscale-400 hover:text-status-red"
                title="Remove field"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Name + Type row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-greyscale-500">Name</label>
                <Input
                  value={field.name}
                  onChange={(e) => updateField(idx, { name: e.target.value })}
                  placeholder="field_name"
                  className="text-xs !h-7 font-mono"
                  error={fieldErrors?.some((e) => e.includes('name'))}
                />
              </div>
              <div>
                <label className="text-[10px] text-greyscale-500">Type</label>
                <SelectField
                  value={field.type}
                  onChange={(v) => updateField(idx, { type: v as SchemaFieldType })}
                  options={typeOptions}
                  className="text-xs !h-7"
                />
              </div>
            </div>

            {/* Required + Default row */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[10px] text-greyscale-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(idx, { required: e.target.checked })}
                  className="rounded border-surface-border h-3 w-3"
                />
                Required
              </label>
              <div className="flex-1">
                <WorkflowExpressionInput
                  value={field.defaultValue}
                  onChange={(v) => updateField(idx, { defaultValue: v })}
                  fieldType="text"
                  placeholder="Default value or drop [[upstream.field]]"
                  className="text-xs !h-7"
                />
              </div>
            </div>

            {/* Description + Example */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-greyscale-500">Description</label>
                <Input
                  value={field.description}
                  onChange={(e) => updateField(idx, { description: e.target.value })}
                  placeholder="What this field is for"
                  className="text-xs !h-7"
                />
              </div>
              <div>
                <label className="text-[10px] text-greyscale-500">Example</label>
                <Input
                  value={field.example}
                  onChange={(e) => updateField(idx, { example: e.target.value })}
                  placeholder="e.g. hello world"
                  className="text-xs !h-7"
                />
              </div>
            </div>

            {/* Options for select types */}
            {(field.type === 'select' || field.type === 'multi_select') && (
              <div>
                <label className="text-[10px] text-greyscale-500">Options (pipe-separated)</label>
                <Input
                  value={field.options ?? ''}
                  onChange={(e) => updateField(idx, { options: e.target.value })}
                  placeholder="option1 | option2 | option3"
                  className="text-xs !h-7"
                />
              </div>
            )}

            {/* Inline errors */}
            {fieldErrors && (
              <div className="space-y-0.5">
                {fieldErrors.map((msg) => (
                  <p key={msg} className="text-[9px] text-status-red">{msg}</p>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Add field button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={addField}
        className="w-full !h-8 gap-1.5 text-xs"
      >
        <Plus size={12} /> Add Field
      </Button>

      {/* Output contract preview */}
      {fields.length > 0 && fields.some((f) => f.name.trim()) && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-greyscale-500">{outputPreviewLabel}</p>
          <div className="rounded-lg border border-surface-border bg-surface-raised p-2 space-y-0.5">
            {fields
              .filter((f) => f.name.trim())
              .map((f) => (
                <div key={f.id} className="flex items-center gap-1.5 text-[10px]">
                  <span className="font-mono font-medium text-greyscale-700 dark:text-greyscale-200">
                    payload.{f.name}
                  </span>
                  <span className="text-greyscale-400">: {f.type}</span>
                  {f.required && (
                    <span className="text-[8px] text-status-red font-semibold">*</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Advanced: raw JSON preview */}
      <div className="border-t border-surface-border pt-2 space-y-1.5">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-[10px] text-greyscale-400 hover:text-greyscale-600 transition-colors"
        >
          <Code2 size={10} />
          {showAdvanced ? 'Hide' : 'Show'} Generated Schema
          <ChevronDown size={10} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
        {showAdvanced && (
          <div className="relative">
            <pre className="rounded-lg border border-surface-border bg-black/5 dark:bg-white/5 p-2 text-[9px] font-mono text-greyscale-600 dark:text-greyscale-300 overflow-x-auto max-h-40">
              {JSON.stringify(generatedSchema, null, 2)}
            </pre>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRawMode(true)}
              className="absolute top-1 right-1 !h-5 !px-2 text-[9px] text-greyscale-400"
              title="Switch to raw JSON editing"
            >
              Edit Raw
            </Button>
          </div>
        )}
      </div>

      {error && <p className="text-[10px] text-status-red">{error}</p>}
    </div>
  )
}
