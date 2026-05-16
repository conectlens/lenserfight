import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { ToolRegistryRecord } from '@lenserfight/types'
import { Tooltip } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Drawer, DrawerFooter } from '@lenserfight/ui/overlays'
import { HelpCircle } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

import { DrawerDocsLink } from './DrawerDocsLink'

interface Props {
  open: boolean
  onClose: () => void
  aiLenserId: string
  registry: ToolRegistryRecord[]
  preferredToolId?: string | null
  onAssigned?: () => void
}

export const AssignToolDrawer: React.FC<Props> = ({
  open,
  onClose,
  aiLenserId,
  registry,
  preferredToolId = null,
  onAssigned,
}) => {
  const [toolId, setToolId] = useState<string>(registry[0]?.id ?? '')
  const [allowed, setAllowed] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toolOptions = useMemo(
    () => registry.map((t) => ({ value: t.id, label: `${t.name} (${t.key})` })),
    [registry],
  )

  useEffect(() => {
    if (!open) return

    const nextToolId =
      (preferredToolId && registry.some((tool) => tool.id === preferredToolId)
        ? preferredToolId
        : registry[0]?.id) ?? ''

    setToolId(nextToolId)
    setAllowed(true)
    setError(null)
  }, [open, preferredToolId, registry])

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
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="w-[420px]"
      title="Assign tool to agent"
      headerExtra={
        <DrawerDocsLink
          path="/how-to/agents/workspace/drawers/assign-tool"
          tip="Allow or deny a registered tool for this agent. Toggling Allowed is idempotent — re-assigning the same tool overwrites the allow flag without creating a duplicate row."
        />
      }
      footer={
        <DrawerFooter
          onCancel={onClose}
          cancelVariant="outline"
          onSubmit={handleAssign}
          submitLabel={submitting ? 'Assigning…' : 'Assign'}
          isLoading={submitting}
          disabled={submitting || !toolId}
        />
      }
    >
      <div className="space-y-4">
        {registry.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No tools registered yet. Register a tool first.
          </p>
        ) : (
          <>
            <FieldLabel
              label="Tool"
              tooltip="The registered tool to assign to this agent. Only tools already in the registry can be assigned. Register new tools via the Register Tool drawer."
            >
              <SelectField
                value={toolId}
                onChange={setToolId}
                options={toolOptions}
              />
            </FieldLabel>

            <Tooltip
              content="When checked the agent may invoke this tool during runs. Uncheck to deny access without removing the assignment record."
              position="top"
              contentClassName="max-w-xs whitespace-normal text-left"
            >
              <label className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
                <input type="checkbox" checked={allowed} onChange={(e) => setAllowed(e.target.checked)} />
                <span>Allowed</span>
              </label>
            </Tooltip>

            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</p>
            )}
          </>
        )}
      </div>
    </Drawer>
  )
}

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
