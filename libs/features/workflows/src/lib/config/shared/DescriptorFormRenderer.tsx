/**
 * DescriptorFormRenderer — renders RunnerConfigFieldDescriptor[] into form fields.
 *
 * Uses @lenserfight/ui/forms primitives (Field, Input, TextArea, SelectField).
 * Manages local state from config.param_overrides. Writes back with __ prefix.
 */

import { Tooltip } from '@lenserfight/ui/components'
import { Field, Input, SelectField } from '@lenserfight/ui/forms'
import { HelpCircle } from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'

import { WorkflowExpressionInput } from '../../components/WorkflowExpressionInput'
import { ConfigFormFooter } from './ConfigFormFooter'
import { KeyValueField } from './KeyValueField'
import { SchemaBuilderField } from './SchemaBuilderField'
import { StringArrayField } from './StringArrayField'
import { ValidationSummary } from './ValidationSummary'

import type { RunnerConfigDescriptor, RunnerFieldTooltip, WorkflowNodeConfig } from '../../types'

export interface DescriptorFormRendererProps {
  descriptor: RunnerConfigDescriptor
  config: WorkflowNodeConfig
  nodeId: string
  onSave: (nodeId: string, config: WorkflowNodeConfig) => void
  onClose: () => void
}

/** Prefix used for runner-specific keys in param_overrides */
const KEY_PREFIX = '__'

function prefixKey(key: string): string {
  return `${KEY_PREFIX}${key}`
}

export function DescriptorFormRenderer({
  descriptor,
  config,
  nodeId,
  onSave,
  onClose,
}: DescriptorFormRendererProps) {
  const existing = (config.param_overrides ?? {}) as Record<string, string>

  // Initialize local state from existing param_overrides
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const field of descriptor.fields) {
      initial[field.key] = existing[prefixKey(field.key)] ?? field.defaultValue ?? ''
    }
    return initial
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const setValue = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    // Clear field error on change
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  // Run field-level validation on blur
  const validateField = useCallback(
    (key: string) => {
      const field = descriptor.fields.find((f) => f.key === key)
      if (!field?.validate) return
      const err = field.validate(values[key], values)
      setFieldErrors((prev) =>
        err ? { ...prev, [key]: err } : (() => { const next = { ...prev }; delete next[key]; return next })()
      )
    },
    [descriptor.fields, values],
  )

  // Full validation (field + cross-field)
  const validateAll = useCallback((): Record<string, string> => {
    const errors: Record<string, string> = {}
    for (const field of descriptor.fields) {
      if (field.required && !values[field.key]?.trim()) {
        errors[field.key] = `${field.label} is required`
      }
      if (field.validate) {
        const err = field.validate(values[field.key], values)
        if (err) errors[field.key] = err
      }
    }
    if (descriptor.validate) {
      const crossErrors = descriptor.validate(values)
      Object.assign(errors, crossErrors)
    }
    return errors
  }, [descriptor, values])

  const handleSave = useCallback(() => {
    const errors = validateAll()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    // Build param_overrides with __ prefixed keys, preserving non-descriptor keys
    const overrides: Record<string, string> = {}
    // Preserve existing keys that aren't managed by this descriptor
    const managedPrefixedKeys = new Set(descriptor.fields.map((f) => prefixKey(f.key)))
    for (const [k, v] of Object.entries(existing)) {
      if (!managedPrefixedKeys.has(k)) overrides[k] = v
    }
    // Set descriptor-managed keys
    for (const field of descriptor.fields) {
      const val = values[field.key]
      if (val !== undefined && val !== '') {
        overrides[prefixKey(field.key)] = val
      }
    }

    onSave(nodeId, {
      ...config,
      param_overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
    })
    onClose()
  }, [validateAll, descriptor.fields, existing, values, onSave, nodeId, config, onClose])

  const allErrors = useMemo(() => {
    const merged = { ...fieldErrors }
    return merged
  }, [fieldErrors])

  return (
    <>
      {descriptor.banner && (
        <div
          className={`rounded-xl border p-3 text-[11px] text-greyscale-600 dark:text-greyscale-300 ${
            descriptor.banner.variant === 'error'
              ? 'border-status-red/20 bg-status-red/5'
              : descriptor.banner.variant === 'warning'
                ? 'border-primary-yellow-500/20 bg-primary-yellow-500/5'
                : 'border-deep-lens-navy-400/20 bg-deep-lens-navy-400/5'
          }`}
        >
          {descriptor.banner.text}
        </div>
      )}

      {descriptor.fields.map((field) => (
        <DescriptorField
          key={field.key}
          field={field}
          value={values[field.key]}
          error={allErrors[field.key]}
          onChange={(v) => setValue(field.key, v)}
          onBlur={() => validateField(field.key)}
        />
      ))}

      <ValidationSummary errors={allErrors} />
      <ConfigFormFooter onSave={handleSave} onClose={onClose} />
    </>
  )
}

// ── Parameter Help ──────────────────────────────────────────────────────────

/** Hints longer than this render as a tooltip icon instead of inline text. */
const INLINE_HINT_MAX = 80

function ParameterHelpTooltip({ hint }: { hint: string }) {
  return (
    <Tooltip
      content={hint}
      position="right"
      delayMs={200}
      contentClassName="max-w-[220px] whitespace-normal"
    >
      <span
        aria-label={`Help: ${hint}`}
        className="inline-flex text-greyscale-400 hover:text-greyscale-600 cursor-help"
      >
        <HelpCircle size={11} />
      </span>
    </Tooltip>
  )
}

/** Rich tooltip with structured metadata — node-aware, field-aware help. */
function RichFieldTooltip({ tooltip }: { tooltip: RunnerFieldTooltip }) {
  const content = (
    <div className="space-y-1.5 text-[10px]">
      <p className="font-medium">{tooltip.summary}</p>
      {tooltip.whenRequired && (
        <p><span className="font-semibold text-primary-yellow-500">When needed:</span> {tooltip.whenRequired}</p>
      )}
      {tooltip.format && (
        <p><span className="font-semibold text-primary-yellow-500">Format:</span> {tooltip.format}</p>
      )}
      {tooltip.commonMistakes && (
        <p><span className="font-semibold text-status-red">Common mistakes:</span> {tooltip.commonMistakes}</p>
      )}
      {tooltip.executionImpact && (
        <p><span className="font-semibold text-deep-lens-navy-400">Execution:</span> {tooltip.executionImpact}</p>
      )}
    </div>
  )

  return (
    <Tooltip
      content={content}
      position="right"
      delayMs={200}
      contentClassName="max-w-[280px] whitespace-normal"
    >
      <span
        aria-label={`Help: ${tooltip.summary}`}
        className="inline-flex text-greyscale-400 hover:text-primary-yellow-500 cursor-help transition-colors"
        tabIndex={0}
        role="button"
      >
        <HelpCircle size={11} />
      </span>
    </Tooltip>
  )
}

// ── Individual Field Renderer ───────────────────────────────────────────────

interface DescriptorFieldProps {
  field: import('../../types').RunnerConfigFieldDescriptor
  value: string
  error?: string
  onChange: (value: string) => void
  onBlur: () => void
}

/** Renders the tooltip trigger (rich or simple) for a field label. */
function FieldTooltipTrigger({ field }: { field: import('../../types').RunnerConfigFieldDescriptor }) {
  if (field.tooltip) return <RichFieldTooltip tooltip={field.tooltip} />
  if (field.hint && field.hint.length > INLINE_HINT_MAX) return <ParameterHelpTooltip hint={field.hint} />
  return null
}

function DescriptorField({ field, value, error, onChange, onBlur }: DescriptorFieldProps) {
  const fieldId = `runner-cfg-${field.key}`
  const isLongHint = !!field.hint && field.hint.length > INLINE_HINT_MAX
  const hasRichTooltip = !!field.tooltip
  // Show inline hint only if short and no rich tooltip replaces it
  const inlineHint = !hasRichTooltip && !isLongHint ? field.hint : undefined

  switch (field.type) {
    case 'schema_builder':
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-medium text-greyscale-600 dark:text-greyscale-300">
              {field.label}
            </label>
            {field.required && <span className="text-[9px] text-status-red">*</span>}
            <FieldTooltipTrigger field={field} />
          </div>
          {inlineHint && (
            <p className="text-[10px] text-greyscale-400">{inlineHint}</p>
          )}
          <SchemaBuilderField
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            error={error}
            allowedTypes={field.allowedSchemaTypes}
          />
        </div>
      )

    case 'textarea':
    case 'code':
    case 'json':
      return (
        <Field label={field.label} id={fieldId} required={field.required} error={error} hint={inlineHint}>
          <WorkflowExpressionInput
            id={fieldId}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            fieldType={field.type}
            multiline
            placeholder={field.placeholder}
            rows={field.rows ?? 4}
            mono={field.mono || field.type === 'code' || field.type === 'json'}
            error={!!error}
          />
          <FieldTooltipTrigger field={field} />
        </Field>
      )

    case 'number':
      return (
        <Field label={field.label} id={fieldId} required={field.required} error={error} hint={inlineHint}>
          <div className="relative">
            <Input
              id={fieldId}
              type="number"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              step={field.step}
              error={!!error}
              className="text-xs"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2">
              <FieldTooltipTrigger field={field} />
            </span>
          </div>
        </Field>
      )

    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={fieldId}
            checked={value === 'true'}
            onChange={(e) => onChange(String(e.target.checked))}
            onBlur={onBlur}
            className="rounded border-surface-border"
          />
          <label htmlFor={fieldId} className="text-[11px] text-greyscale-600 dark:text-greyscale-300">
            {field.label}
          </label>
          <FieldTooltipTrigger field={field} />
        </div>
      )

    case 'select':
      return (
        <Field label={field.label} id={fieldId} required={field.required} error={error} hint={inlineHint}>
          <div className="relative">
            <SelectField
              value={value}
              onChange={onChange}
              options={field.options ?? []}
              placeholder={field.placeholder}
              error={error}
              className="text-xs"
            />
            <span className="absolute right-8 top-1/2 -translate-y-1/2">
              <FieldTooltipTrigger field={field} />
            </span>
          </div>
        </Field>
      )

    case 'datetime':
      return (
        <Field label={field.label} id={fieldId} required={field.required} error={error} hint={inlineHint}>
          <div className="relative">
            <Input
              id={fieldId}
              type="datetime-local"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
              error={!!error}
              className="text-xs"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2">
              <FieldTooltipTrigger field={field} />
            </span>
          </div>
        </Field>
      )

    case 'string_array':
      return (
        <Field label={field.label} id={fieldId} required={field.required} error={error} hint={inlineHint}>
          <StringArrayField
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            error={!!error}
            placeholder={field.placeholder}
            itemPlaceholder={field.label}
          />
          <FieldTooltipTrigger field={field} />
        </Field>
      )

    case 'key_value':
      return (
        <Field label={field.label} id={fieldId} required={field.required} error={error} hint={inlineHint}>
          <KeyValueField
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            error={!!error}
            keyPlaceholder={field.placeholder ?? 'Key'}
            valuePlaceholder="Value"
          />
          <FieldTooltipTrigger field={field} />
        </Field>
      )

    case 'text':
    default:
      return (
        <Field label={field.label} id={fieldId} required={field.required} error={error} hint={inlineHint}>
          <WorkflowExpressionInput
            id={fieldId}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            fieldType="text"
            placeholder={field.placeholder}
            mono={field.mono}
            error={!!error}
          />
          <FieldTooltipTrigger field={field} />
        </Field>
      )
  }
}
