import { queryKeys } from '@lenserfight/data/cache'
import { toolsService } from '@lenserfight/data/repositories'
import { Badge, Button } from '@lenserfight/ui/components'
import { TextArea } from '@lenserfight/ui/forms'
import { AlertDialog, Drawer } from '@lenserfight/ui/overlays'
import { DrawerDocsLink } from './DrawerDocsLink'
import type {
  ToolInvocationApprovalStatus,
  ToolInvocationRecord,
  ToolInvocationStatus,
} from '@lenserfight/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Activity, AlertTriangle, Check, X } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

interface ToolInvocationDrawerProps {
  open: boolean
  onClose: () => void
  invocation: ToolInvocationRecord | null
  aiLenserId: string
  canManage: boolean
}

const STATUS_BADGE: Record<ToolInvocationStatus, 'gray' | 'green' | 'red' | 'yellow' | 'blue'> = {
  pending: 'yellow',
  approved: 'blue',
  rejected: 'red',
  running: 'blue',
  completed: 'green',
  failed: 'red',
}

const APPROVAL_BADGE: Record<ToolInvocationApprovalStatus, 'gray' | 'yellow' | 'green' | 'red'> = {
  not_required: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
}

const EGRESS_BADGE: Record<string, 'gray' | 'yellow' | 'red'> = {
  none: 'gray',
  read_only: 'yellow',
  write: 'red',
}

const JsonBlock: React.FC<{ label: string; value: unknown }> = ({ label, value }) => {
  const [expanded, setExpanded] = useState(false)
  if (value === null || value === undefined) {
    return (
      <div className="mt-2">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
          {label}
        </p>
        <p className="text-xs text-gray-400">empty</p>
      </div>
    )
  }
  const text = JSON.stringify(value, null, 2)
  const preview = text.length > 120 ? `${text.slice(0, 120)}…` : text
  return (
    <div className="mt-2">
      <Button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        {label} {expanded ? '▲' : '▼'}
      </Button>
      <pre className="overflow-x-auto rounded-xl border border-gray-100 bg-gray-50 p-2 font-mono text-[11px] text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        {expanded ? text : preview}
      </pre>
    </div>
  )
}

export const ToolInvocationDrawer: React.FC<ToolInvocationDrawerProps> = ({
  open,
  onClose,
  invocation,
  aiLenserId,
  canManage,
}) => {
  const queryClient = useQueryClient()
  const [confirmReject, setConfirmReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.toolInvocations({ aiLenserId }),
    })
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.toolApprovalQueue(aiLenserId),
    })
  }

  const approveMutation = useMutation({
    mutationFn: () => toolsService.approveInvocation(invocation!.id),
    onSuccess: () => {
      toast.success('Tool invocation approved')
      invalidate()
      onClose()
    },
    onError: (cause) => toast.error((cause as Error).message),
  })

  const rejectMutation = useMutation({
    mutationFn: () => toolsService.rejectInvocation(invocation!.id, rejectReason || undefined),
    onSuccess: () => {
      toast.success('Tool invocation rejected')
      invalidate()
      setConfirmReject(false)
      setRejectReason('')
      onClose()
    },
    onError: (cause) => toast.error((cause as Error).message),
  })

  if (!invocation) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        side="right"
        width="w-[600px]"
        title="Tool invocation"
        headerExtra={
          <DrawerDocsLink
            path="/how-to/agents/workspace/drawers/tool-invocation"
            tip="Forensic view of one tool call — args, result, egress class, and approval chain. Approve or reject pending invocations here; the agent unblocks or fails accordingly."
          />
        }
      >
        {null}
      </Drawer>
    )
  }

  const durationMs =
    invocation.started_at && invocation.completed_at
      ? new Date(invocation.completed_at).getTime() -
        new Date(invocation.started_at).getTime()
      : null

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="w-[640px]"
      title={invocation.tool_name ?? invocation.tool_key ?? 'Tool invocation'}
      headerExtra={
        <DrawerDocsLink
          path="/how-to/agents/workspace/drawers/tool-invocation"
          tip="Forensic view of one tool call — args, result, egress class, and approval chain. Approve or reject pending invocations here; the agent unblocks or fails accordingly."
        />
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={STATUS_BADGE[invocation.status]}>{invocation.status}</Badge>
            <Badge color={APPROVAL_BADGE[invocation.approval_status]}>
              approval: {invocation.approval_status}
            </Badge>
            {invocation.egress_class && (
              <Badge color={EGRESS_BADGE[invocation.egress_class] ?? 'gray'}>
                egress: {invocation.egress_class}
              </Badge>
            )}
            {invocation.is_dangerous && (
              <Badge color="red" variant="outline">
                <AlertTriangle size={11} className="mr-1 inline" /> dangerous
              </Badge>
            )}
            {invocation.cost_estimate !== null && (
              <Badge color="purple">cost {invocation.cost_estimate.toFixed(4)}</Badge>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                Started
              </dt>
              <dd className="mt-1 text-gray-700 dark:text-gray-300">
                {invocation.started_at
                  ? new Date(invocation.started_at).toLocaleString()
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                Duration
              </dt>
              <dd className="mt-1 text-gray-700 dark:text-gray-300">
                {durationMs !== null ? `${(durationMs / 1000).toFixed(2)}s` : '—'}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                Step
              </dt>
              <dd className="mt-1 text-gray-700 dark:text-gray-300">
                {invocation.step_title ?? <span className="text-gray-400">—</span>}
              </dd>
            </div>
          </dl>

          <JsonBlock label="Input" value={invocation.input} />
          {invocation.output !== null && <JsonBlock label="Output" value={invocation.output} />}
          {invocation.error && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <AlertTriangle size={12} className="mr-1 inline" />
              {invocation.error}
            </p>
          )}
          {invocation.approval_reason && (
            <p className="mt-3 rounded-xl border border-primary-yellow-200 bg-primary-yellow-50 px-3 py-2 text-xs text-primary-yellow-800 dark:border-primary-yellow-500/30 dark:bg-primary-yellow-500/10 dark:text-primary-yellow-200">
              Reason: {invocation.approval_reason}
            </p>
          )}
        </div>

        {canManage && invocation.approval_status === 'pending' && (
          <div className="flex justify-end gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmReject(true)}
              isLoading={rejectMutation.isPending}
            >
              <X size={14} className="mr-2 inline" />
              Reject
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => approveMutation.mutate()}
              isLoading={approveMutation.isPending}
            >
              <Check size={14} className="mr-2 inline" />
              Approve
            </Button>
          </div>
        )}

        {invocation.status === 'running' && (
          <p className="flex items-center gap-2 text-xs text-gray-500">
            <Activity size={12} className="animate-pulse" />
            Tool is currently running…
          </p>
        )}
      </div>

      <AlertDialog
        open={confirmReject}
        onClose={() => setConfirmReject(false)}
        title="Reject tool invocation?"
        bodyText="The agent will not retry this call. The reason is saved on the invocation record."
        variant="destructive"
        confirmAction={{
          label: 'Reject',
          onClick: () => rejectMutation.mutate(),
          loading: rejectMutation.isPending,
        }}
      >
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-greyscale-700 dark:text-greyscale-300">
            Reason (optional)
          </label>
          <TextArea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Why is this rejected?"
          />
        </div>
      </AlertDialog>
    </Drawer>
  )
}
