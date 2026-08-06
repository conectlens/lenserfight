import { callRpc } from '@lenserfight/cli-client'

export interface ApprovalRequestRow {
  id: string
  ai_lenser_id: string
  team_id: string | null
  workflow_id: string | null
  workflow_run_id: string | null
  workflow_assignment_id: string | null
  status: string
  approval_status: string
  scratchpad: Record<string, unknown>
  metadata: Record<string, unknown>
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface ListApprovalsOptions {
  aiLenserId?: string
  status?: string
  limit?: number
}

/** Read-only mirror of the RPC calls in commands/approval.ts's `list`. Mutations stay routed through the CLI command via dispatchInProcess so the safety gate/audit trail is never duplicated. */
export async function listApprovalRequests(opts: ListApprovalsOptions = {}): Promise<ApprovalRequestRow[]> {
  const rows = await callRpc<ApprovalRequestRow[]>(
    'fn_list_approval_requests',
    {
      p_ai_lenser_id: opts.aiLenserId ?? null,
      p_approval_status: opts.status ?? null,
      p_limit: opts.limit ?? 50,
    },
    { requireAuth: true },
  )
  return rows ?? []
}

export async function getApprovalRequest(requestId: string): Promise<Record<string, unknown> | null> {
  return callRpc<Record<string, unknown> | null>(
    'fn_get_approval_request',
    { p_request_id: requestId },
    { requireAuth: true },
  )
}

export async function countPendingApprovals(): Promise<number> {
  const rows = await listApprovalRequests({ status: 'pending', limit: 200 })
  return rows.length
}
