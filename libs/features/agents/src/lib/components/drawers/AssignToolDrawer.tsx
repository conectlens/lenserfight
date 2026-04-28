import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { Drawer } from '@lenserfight/ui/overlays'
import type { ToolRegistryRecord } from '@lenserfight/types'
import React, { useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  aiLenserId: string
  registry: ToolRegistryRecord[]
  onAssigned?: () => void
}

export const AssignToolDrawer: React.FC<Props> = ({
  open,
  onClose,
  aiLenserId,
  registry,
  onAssigned,
}) => {
  const [toolId, setToolId] = useState<string>(registry[0]?.id ?? '')
  const [allowed, setAllowed] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAssign = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await agentWorkspaceService.assignTool({
        ai_lenser_id: aiLenserId,
        tool_id: toolId,
        allowed,
      })
      onAssigned?.()
      onClose()
    } catch (err) {
      setError((err as Error).message ?? 'Assign failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer open={open} onClose={onClose} side="right" width="w-[420px]" title="Assign tool to agent">
      <div className="space-y-4">
        {registry.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No tools registered yet. Register a tool first.
          </p>
        ) : (
          <>
            <Field label="Tool">
              <select value={toolId} onChange={(e) => setToolId(e.target.value)} className={inputClass}>
                {registry.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.key})</option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
              <input type="checkbox" checked={allowed} onChange={(e) => setAllowed(e.target.checked)} />
              <span>Allowed</span>
            </label>
            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-200">Cancel</button>
              <button type="button" onClick={handleAssign} disabled={submitting || !toolId} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900">
                {submitting ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </>
        )}
      </div>
    </Drawer>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{label}</span>
    {children}
  </label>
)
