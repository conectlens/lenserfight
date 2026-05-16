/**
 * DescriptorFormRenderer — renders RunnerConfigFieldDescriptor[] into form fields.
 *
 * Uses @lenserfight/ui/forms primitives (Field, Input, TextArea, SelectField).
 * Manages local state from config.param_overrides. Writes back with __ prefix.
 */

import { Field, Input, TextArea } from '@lenserfight/ui/forms'
import { SelectField } from '@lenserfight/ui/forms'
import { Tooltip } from '@lenserfight/ui/components'
import { HelpCircle } from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'

import type { RunnerConfigDescriptor, WorkflowNodeConfig } from '../../types'
import { WorkflowExpressionInput } from '../../components/WorkflowExpressionInput'
import { ConfigFormFooter } from './ConfigFormFooter'
import { ValidationSummary } from './ValidationSummary'

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

// ── Individual Field Renderer ───────────────────────────────────────────────

interface DescriptorFieldProps {
  field: import('../../types').RunnerConfigFieldDescriptor
  value: string
  error?: string
  onChange: (value: string) => void
  onBlur: () => void
}

function DescriptorField({ field, value, error, onChange, onBlur }: DescriptorFieldProps) {
  const fieldId = `runner-cfg-${field.key}`
  const isLongHint = !!field.hint && field.hint.length > INLINE_HINT_MAX

  switch (field.type) {
    case 'textarea':
    case 'code':
    case 'json':
      return (
        <Field label={field.label} id={fieldId} required={field.required} error={error} hint={isLongHint ? undefined : field.hint}>
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
          {isLongHint && <ParameterHelpTooltip hint={field.hint!} />}
        </Field>
      )

    case 'number':
      return (
        <Field label={field.label} id={fieldId} required={field.required} error={error} hint={isLongHint ? undefined : field.hint}>
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
            {isLongHint && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2">
                <ParameterHelpTooltip hint={field.hint!} />
              </span>
            )}
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
          {field.hint && <ParameterHelpTooltip hint={field.hint} />}
        </div>
      )

    case 'select':
      return (
        <Field label={field.label} id={fieldId} required={field.required} error={error} hint={isLongHint ? undefined : field.hint}>
          <div className="relative">
            <SelectField
              value={value}
              onChange={onChange}
              options={field.options ?? []}
              placeholder={field.placeholder}
              error={error}
              className="text-xs"
            />
            {isLongHint && (
              <span className="absolute right-8 top-1/2 -translate-y-1/2">
                <ParameterHelpTooltip hint={field.hint!} />
              </span>
            )}
          </div>
        </Field>
      )

    case 'datetime':
      return (
        <Field label={field.label} id={fieldId} required={field.required} error={error} hint={isLongHint ? undefined : field.hint}>
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
            {isLongHint && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2">
                <ParameterHelpTooltip hint={field.hint!} />
              </span>
            )}
          </div>
        </Field>
      )

    case 'text':
    default:
      return (
        <Field label={field.label} id={fieldId} required={field.required} error={error} hint={isLongHint ? undefined : field.hint}>
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
          {isLongHint && <ParameterHelpTooltip hint={field.hint!} />}
        </Field>
      )
  }
}
