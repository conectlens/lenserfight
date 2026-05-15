import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { AgentToolProfileRecord } from '@lenserfight/types'
import { Button } from '@lenserfight/ui/components'
import { Drawer, DrawerFooter } from '@lenserfight/ui/overlays'
import React, { useEffect, useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  aiLenserId: string
  initial?: AgentToolProfileRecord | null
  onSaved?: (record: AgentToolProfileRecord) => void
}

export const ToolProfileDrawer: React.FC<Props> = ({
  open,
  onClose,
  aiLenserId,
  initial,
  onSaved,
}) => {
  const isEdit = !!initial
  const [name, setName] = useState(initial?.name ?? 'Ops Toolbelt')
  const [allowTools, setAllowTools] = useState(
    (initial?.allow_tools ?? []).join(', ')
  )
  const [denyTools, setDenyTools] = useState(
    (initial?.deny_tools ?? []).join(', ')
  )
  const [toolGroups, setToolGroups] = useState(
    (initial?.tool_groups ?? ['workflow', 'catalog', 'logging']).join(', ')
  )
  const [requiresApproval, setRequiresApproval] = useState(
    initial?.requires_approval ?? true
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? 'Ops Toolbelt')
    setAllowTools((initial?.allow_tools ?? []).join(', '))
    setDenyTools((initial?.deny_tools ?? []).join(', '))
    setToolGroups(
      (initial?.tool_groups ?? ['workflow', 'catalog', 'logging']).join(', ')
    )
    setRequiresApproval(initial?.requires_approval ?? true)
    setError(null)
  }, [open, initial])

  const parseList = (raw: string) =>
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  const handleSave = async () => {
    setSubmitting(true)
    setError(null)
    try {
      let result: AgentToolProfileRecord | null
      const payload = {
        name,
        allow_tools: parseList(allowTools),
        deny_tools: parseList(denyTools),
        tool_groups: parseList(toolGroups),
        requires_approval: requiresApproval,
      }
      if (isEdit && initial) {
        result = await agentWorkspaceService.updateToolProfile(initial.id, payload)
      } else {
        result = await agentWorkspaceService.createToolProfile({
          ai_lenser_id: aiLenserId,
          ...payload,
        })
      }
      if (result) onSaved?.(result)
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
      width="w-[520px]"
      title={isEdit ? 'Edit tool profile' : 'Create tool profile'}
      footer={
        <DrawerFooter
          onCancel={onClose}
          cancelVariant="outline"
          onSubmit={handleSave}
          submitLabel={submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
          isLoading={submitting}
          disabled={submitting}
        />
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Allow tools (comma-separated keys)">
          <input value={allowTools} onChange={(e) => setAllowTools(e.target.value)} placeholder="search.web, github.repo.read" className={inputClass} />
        </Field>
        <Field label="Deny tools (comma-separated keys)">
          <input value={denyTools} onChange={(e) => setDenyTools(e.target.value)} placeholder="email.send, payments.charge" className={inputClass} />
        </Field>
        <Field label="Tool groups (comma-separated)">
          <input value={toolGroups} onChange={(e) => setToolGroups(e.target.value)} placeholder="workflow, catalog, logging" className={inputClass} />
        </Field>
        <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm dark:border-gray-700">
          <input
            type="checkbox"
            checked={requiresApproval}
            onChange={(e) => setRequiresApproval(e.target.checked)}
          />
          <span className="text-gray-800 dark:text-gray-200">
            Require human approval for dangerous tool calls
          </span>
        </label>
        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</p>
        )}

      </div>
    </Drawer>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-yellow-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{label}</span>
    {children}
  </label>
)
