import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { ToolAuthMethod, ToolRegistryRecord } from '@lenserfight/types'
import { Tooltip } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Drawer, DrawerFooter } from '@lenserfight/ui/overlays'
import { HelpCircle } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import type { ToolTemplatePreset } from '../toolTemplates'
import { DrawerDocsLink } from './DrawerDocsLink'

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
      headerExtra={
        <DrawerDocsLink
          path="/how-to/agents/workspace/drawers/register-tool"
          tip="Declare a new tool in the registry. After registration, open the Assign Tool drawer to grant this agent access. Tool keys are permanent — choose carefully."
        />
      }
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

        <FieldLabel
          label="Key (unique within owner)"
          tooltip="Stable, lowercase slug used in workflows and assignments. Cannot be changed after creation. Example: 'web.search', 'github.pr.create'."
        >
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="search.web"
            className={inputClass}
            disabled={isEdit}
          />
        </FieldLabel>

        <FieldLabel
          label="Name"
          tooltip="Human-readable label shown in pickers and approval gates."
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Web search"
            className={inputClass}
          />
        </FieldLabel>

        <FieldLabel
          label="Description"
          tooltip="Surfaces in the tool picker tooltip and approval review screen. Describe what the tool does and its side effects."
        >
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClass} resize-none`}
          />
        </FieldLabel>

        <div className="grid grid-cols-2 gap-3">
          <FieldLabel
            label="Category"
            tooltip="Groups tools in the picker. Use existing categories like 'search', 'code', 'communication' for consistency."
          >
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            />
          </FieldLabel>

          <FieldLabel
            label="Auth method"
            tooltip="'none' = no credentials; 'api_key' = secret stored in Vault; 'oauth' = user-delegated token; 'service_account' = workspace-level credentials."
          >
            <SelectField
              value={authMethod}
              onChange={(v) => setAuthMethod(v as ToolAuthMethod)}
              options={AUTH_METHOD_OPTIONS}
            />
          </FieldLabel>
        </div>

        <FieldLabel
          label="Input schema (JSON)"
          tooltip="JSON Schema describing the tool's input. Used for validation and auto-generated type hints in the workflow editor."
        >
          <textarea
            rows={4}
            value={schemaInput}
            onChange={(e) => setSchemaInput(e.target.value)}
            className={`${inputClass} resize-none font-mono text-xs`}
          />
        </FieldLabel>

        <FieldLabel
          label="Output schema (JSON)"
          tooltip="JSON Schema describing what the tool returns. Optional but improves downstream type safety in workflow nodes."
        >
          <textarea
            rows={4}
            value={schemaOutput}
            onChange={(e) => setSchemaOutput(e.target.value)}
            className={`${inputClass} resize-none font-mono text-xs`}
          />
        </FieldLabel>

        <div className="grid grid-cols-2 gap-3">
          <Tooltip
            content="Approval gate fires before every invocation. Required for any tool that writes data, deletes records, or incurs external charges."
            position="top"
            contentClassName="max-w-xs whitespace-normal text-left"
          >
            <label className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
              />
              <span>Requires approval</span>
            </label>
          </Tooltip>
          <Tooltip
            content="Tags this tool as high-risk. Dangerous tools always appear in approval queues and are excluded from autonomous runs by default."
            position="top"
            contentClassName="max-w-xs whitespace-normal text-left"
          >
            <label className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
              <input
                type="checkbox"
                checked={isDangerous}
                onChange={(e) => setIsDangerous(e.target.checked)}
              />
              <span>Dangerous tool</span>
            </label>
          </Tooltip>
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

const FieldLabel: React.FC<{
  label: string
  tooltip?: string
  children: React.ReactNode
}> = ({ label, tooltip, children }) => (
  <div className="block">
    <div className="mb-1 flex items-center gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
        {label}
      </span>
      {tooltip && (
        <Tooltip content={tooltip} position="top" contentClassName="max-w-xs whitespace-normal text-left">
          <HelpCircle
            size={12}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            aria-label={`${label} — help`}
          />
        </Tooltip>
      )}
    </div>
    {children}
  </div>
)
