import { queryKeys } from '@lenserfight/data/cache'
import { toolsService } from '@lenserfight/data/repositories'
import { Badge, Button, Table, type Column } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import type {
  ToolInvocationApprovalStatus,
  ToolInvocationRecord,
  ToolInvocationStatus,
} from '@lenserfight/types'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import React, { useState } from 'react'

import { ToolInvocationDrawer } from '../drawers/ToolInvocationDrawer'
import { EmptyPanel } from '../EmptyPanel'

interface ToolInvocationsTabProps {
  aiLenserId: string
  isOwner: boolean
}

const STATUS_OPTIONS: Array<{ value: '' | ToolInvocationStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'pending' },
  { value: 'running', label: 'running' },
  { value: 'completed', label: 'completed' },
  { value: 'failed', label: 'failed' },
  { value: 'rejected', label: 'rejected' },
]

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

export const ToolInvocationsTab: React.FC<ToolInvocationsTabProps> = ({ aiLenserId, isOwner }) => {
  const [statusFilter, setStatusFilter] = useState<'' | ToolInvocationStatus>('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [active, setActive] = useState<ToolInvocationRecord | null>(null)

  const invocationsQuery = useQuery<ToolInvocationRecord[]>({
    queryKey: queryKeys.agents.toolInvocations({
      aiLenserId,
      status: statusFilter || undefined,
    }),
    queryFn: () =>
      toolsService.listInvocations({
        ai_lenser_id: aiLenserId,
        status: statusFilter || undefined,
        limit: 100,
      }),
    staleTime: 5_000,
  })

  const invocations = invocationsQuery.data ?? []

  const columns: Column<ToolInvocationRecord>[] = [
    {
      header: 'Tool',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {row.tool_name ?? row.tool_key ?? row.tool_id.slice(0, 8)}
          </p>
          {row.step_title && (
            <p className="truncate text-[11px] text-gray-500">{row.step_title}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      render: (row) => <Badge color={STATUS_BADGE[row.status]}>{row.status}</Badge>,
    },
    {
      header: 'Approval',
      render: (row) => (
        <Badge color={APPROVAL_BADGE[row.approval_status]}>{row.approval_status}</Badge>
      ),
    },
    {
      header: 'Egress',
      render: (row) =>
        row.egress_class ? (
          <Badge color={row.egress_class === 'write' ? 'red' : 'gray'}>
            {row.egress_class}
          </Badge>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      header: 'Cost',
      render: (row) =>
        row.cost_estimate !== null ? (
          <span className="font-mono text-xs">{row.cost_estimate.toFixed(4)}</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      header: 'Started',
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-gray-500">
          {row.started_at ? new Date(row.started_at).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      header: '',
      render: (row) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActive(row)
              setDrawerOpen(true)
            }}
          >
            Open
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="w-60">
          <SelectField
            label="Filter by status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as '' | ToolInvocationStatus)}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      <Table<ToolInvocationRecord>
        columns={columns}
        data={invocations}
        keyExtractor={(row) => row.id}
        isLoading={invocationsQuery.isLoading}
        emptyState={
          <EmptyPanel
            icon={<ClipboardList size={20} />}
            title="No tool invocations yet"
            description="Invocations appear here when an agent run calls an assigned tool. Try dispatching a workflow that uses one of your registered tools."
          />
        }
      />

      <ToolInvocationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        invocation={active}
        aiLenserId={aiLenserId}
        canManage={isOwner}
      />
    </div>
  )
}
