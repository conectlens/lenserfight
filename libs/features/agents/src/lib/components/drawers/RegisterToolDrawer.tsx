import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { ToolAuthMethod, ToolRegistryRecord } from '@lenserfight/types'
import { Button } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Drawer, DrawerFooter } from '@lenserfight/ui/overlays'
import React, { useEffect, useState } from 'react'

import type { ToolTemplatePreset } from '../toolTemplates'

interface Props {
  open: boolean
  onClose: () => void
  initial?: ToolRegistryRecord | null
  preset?: ToolTemplatePreset | null
  onSaved?: (record: ToolRegistryRecord) => void
}

const AUTH_METHODS = ['none', 'api_key', 'oauth', 'service_account']
const AUTH_METHOD_OPTIONS = AUTH_METHODS.map((m) => ({ value: m, label: m }))

export const RegisterToolDrawer: React.FC<Props> = ({
  open,
  onClose,
  initial,
  preset,
  onSaved,
}) => {
  const isEdit = !!initial
  const [key, setKey] = useState(initial?.key ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'general')
  const [authMethod, setAuthMethod] = useState<ToolAuthMethod>(
    initial?.auth_method ?? 'none'
  )
  const [requiresApproval, setRequiresApproval] = useState(
    initial?.requires_approval ?? false
  )
  const [isDangerous, setIsDangerous] = useState(initial?.is_dangerous ?? false)
  const [schemaInput, setSchemaInput] = useState(
    JSON.stringify(initial?.schema_input ?? {}, null, 2)
  )
  const [schemaOutput, setSchemaOutput] = useState(
    JSON.stringify(initial?.schema_output ?? {}, null, 2)
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const source = initial ?? preset ?? null
    setKey(source?.key ?? '')
    setName(source?.name ?? '')
    setDescription(source?.description ?? '')
    setCategory(source?.category ?? 'general')
    setAuthMethod(source?.auth_method ?? 'none')
    setRequiresApproval(source?.requires_approval ?? false)
    setIsDangerous(source?.is_dangerous ?? false)
    setSchemaInput(JSON.stringify(source?.schema_input ?? {}, null, 2))
    setSchemaOutput(JSON.stringify(source?.schema_output ?? {}, null, 2))
    setError(null)
  }, [open, initial, preset])

  const handleSave = async () => {
    setSubmitting(true)
    setError(null)
    try {
      let parsedInput: Record<string, unknown> = {}
      let parsedOutput: Record<string, unknown> = {}
      try {
        parsedInput = JSON.parse(schemaInput || '{}')
      } catch {
        throw new Error('Input schema must be valid JSON')
      }
      try {
        parsedOutput = JSON.parse(schemaOutput || '{}')
      } catch {
        throw new Error('Output schema must be valid JSON')
      }
      const record = await agentWorkspaceService.registerTool({
        key,
        name,
        description: description || null,
        category,
        schema_input: parsedInput,
        schema_output: parsedOutput,
        auth_method: authMethod as 'none' | 'api_key' | 'oauth' | 'service_account',
        requires_approval: requiresApproval,
        is_dangerous: isDangerous,
      })
      onSaved?.(record)
      onClose()
    } catch (err) {
      setError((err as Error).message ?? 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="w-[600px]"
      title={isEdit ? 'Edit tool registry' : 'Register external tool'}
      footer={
        <DrawerFooter
          onCancel={onClose}
          cancelVariant="outline"
          onSubmit={handleSave}
          submitLabel={submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Register'}
          isLoading={submitting}
          disabled={submitting || !key || !name}
        />
      }
    >
      <div className="space-y-4">
        {!isEdit && preset && (
          <div className="rounded-2xl border border-primary-yellow-200 bg-primary-yellow-50/70 px-4 py-3 text-sm text-primary-yellow-800 dark:border-primary-yellow-500/20 dark:bg-primary-yellow-500/10 dark:text-primary-yellow-200">
            Starting from template: <span className="font-semibold">{preset.label}</span>
          </div>
        )}
        <Field label="Key (unique within owner)">
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="search.web" className={inputClass} disabled={isEdit} />
        </Field>
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Web search" className={inputClass} />
        </Field>
        <Field label="Description">
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} resize-none`} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} />
          </Field>
          <SelectField
            label="Auth method"
            value={authMethod}
            onChange={(v) => setAuthMethod(v as ToolAuthMethod)}
            options={AUTH_METHOD_OPTIONS}
          />
        </div>
        <Field label="Input schema (JSON)">
          <textarea rows={4} value={schemaInput} onChange={(e) => setSchemaInput(e.target.value)} className={`${inputClass} resize-none font-mono text-xs`} />
        </Field>
        <Field label="Output schema (JSON)">
          <textarea rows={4} value={schemaOutput} onChange={(e) => setSchemaOutput(e.target.value)} className={`${inputClass} resize-none font-mono text-xs`} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
            <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />
            <span>Requires approval</span>
          </label>
          <label className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
            <input type="checkbox" checked={isDangerous} onChange={(e) => setIsDangerous(e.target.checked)} />
            <span>Dangerous tool</span>
          </label>
        </div>
        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</p>
        )}

      </div>
    </Drawer>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-yellow-400 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{label}</span>
    {children}
  </label>
)
