import { queryKeys } from '@lenserfight/data/cache'
import { toolsService } from '@lenserfight/data/repositories'
import { Badge, Button, Table, type Column } from '@lenserfight/ui/components'
import type { ToolInvocationRecord } from '@lenserfight/types'
import { useQuery } from '@tanstack/react-query'
import { ShieldAlert } from 'lucide-react'
import React, { useState } from 'react'

import { ToolInvocationDrawer } from '../drawers/ToolInvocationDrawer'
import { EmptyPanel } from '../EmptyPanel'

interface ToolApprovalQueueTabProps {
  aiLenserId: string
  isOwner: boolean
}

export const ToolApprovalQueueTab: React.FC<ToolApprovalQueueTabProps> = ({
  aiLenserId,
  isOwner,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [active, setActive] = useState<ToolInvocationRecord | null>(null)

  const queueQuery = useQuery<ToolInvocationRecord[]>({
    queryKey: queryKeys.agents.toolApprovalQueue(aiLenserId),
    queryFn: () => toolsService.listPendingApprovals(aiLenserId),
    staleTime: 5_000,
  })

  const queue = queueQuery.data ?? []

  const columns: Column<ToolInvocationRecord>[] = [
    {
      header: 'Tool',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {row.tool_name ?? row.tool_key ?? row.tool_id.slice(0, 8)}
          </p>
          {row.is_dangerous && (
            <Badge color="red" variant="outline">
              dangerous
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Egress',
      render: (row) =>
        row.egress_class ? (
          <Badge color={row.egress_class === 'write' ? 'red' : 'gray'}>{row.egress_class}</Badge>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      header: 'Run',
      render: (row) => (
        <span className="font-mono text-xs text-gray-600">{row.team_run_id.slice(0, 8)}</span>
      ),
    },
    {
      header: 'Requested',
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-gray-500">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      header: '',
      render: (row) => (
        <div className="flex justify-end">
          <Button
            variant="dark"
            size="sm"
            onClick={() => {
              setActive(row)
              setDrawerOpen(true)
            }}
          >
            Review
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <Table<ToolInvocationRecord>
        columns={columns}
        data={queue}
        keyExtractor={(row) => row.id}
        isLoading={queueQuery.isLoading}
        emptyState={
          <EmptyPanel
            icon={<ShieldAlert size={20} />}
            title="No pending approvals"
            description="Tool calls that require human authorization appear here. Approve them to let the agent continue, or reject with a reason."
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
