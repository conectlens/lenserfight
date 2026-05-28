// Phase BN — structured prompt variables form.
//
// Renders one input per template variable, validates required fields, and
// emits the rendered prompt back to the wizard via onRendered.

import { Button } from '@lenserfight/ui/components'
import { Input, Field } from '@lenserfight/ui/forms'
import { battlesRepository } from '@lenserfight/data/repositories'
import React, { useState } from 'react'

export interface PromptVariableDescriptor {
  key: string
  label: string
  defaultValue?: string | null
  required: boolean
}

export interface PromptVariableFormProps {
  templateId: string
  variables: PromptVariableDescriptor[]
  onRendered: (rendered: string, values: Record<string, string>) => void
  className?: string
}

export function PromptVariableForm({
  templateId,
  variables,
  onRendered,
  className,
}: PromptVariableFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const v of variables) {
      init[v.key] = v.defaultValue ?? ''
    }
    return init
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const missing = variables
        .filter((v) => v.required && !values[v.key])
        .map((v) => v.label)
      if (missing.length > 0) {
        setError(`Missing required: ${missing.join(', ')}`)
        return
      }
      const rendered = await battlesRepository.renderTemplatePrompt(templateId, values)
      onRendered(rendered, values)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${className ?? ''}`}>
      {variables.map((v) => (
        <Field key={v.key} label={`${v.label}${v.required ? ' *' : ''}`}>
          <Input
            value={values[v.key] ?? ''}
            onChange={(e) => setValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
            placeholder={v.defaultValue ?? ''}
            required={v.required}
          />
        </Field>
      ))}
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <Button type="submit" isLoading={busy} disabled={busy}>
        Use these values
      </Button>
    </form>
  )
}
