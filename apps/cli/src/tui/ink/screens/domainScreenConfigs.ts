import { getAgentWorkspaceContext } from '../../../lib/agent-workspace-context'
import {
  listApprovalRequests,
  listSchedules,
  listMemoryProfiles,
  readMemoryEntries,
  getHumanActivityFeed,
} from '../../../lib/data-services'
import { listAiLensers, listLensers } from '../../../lib/lenser-catalog'

import type { DataTableColumn } from '../shared/DataTable'
import type { ConfirmRequest, DomainId } from '../state/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DomainRow = Record<string, any>

export interface DomainAction {
  key: string
  label: string
  buildArgv: (row: DomainRow) => string[]
  visible?: (row: DomainRow) => boolean
  confirm?: {
    title: string
    description: (row: DomainRow) => string
    risk: ConfirmRequest['risk']
    confirmLabel?: string
  }
}

export interface DomainListConfig {
  id: DomainId
  title: string
  columns: DataTableColumn[]
  fetch: () => Promise<DomainRow[]>
  rowId: (row: DomainRow, index: number) => string
  toCells: (row: DomainRow) => Record<string, string>
  actions: DomainAction[]
  emptyMessage: string
  emptyHint?: string
  detailFields: Array<{ label: string; get: (row: DomainRow) => string }>
}

function fmtDate(value: unknown): string {
  if (!value || typeof value !== 'string') return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

function fmtBool(value: unknown): string {
  return value ? 'active' : 'inactive'
}

export const AGENTS_CONFIG: DomainListConfig = {
  id: 'agents',
  title: 'Agents',
  columns: [
    { key: 'handle', label: 'HANDLE', width: 20 },
    { key: 'display_name', label: 'NAME', width: 24 },
    { key: 'status', label: 'STATUS', width: 12, status: true },
    { key: 'created_at', label: 'CREATED', width: 22 },
  ],
  fetch: async () => await listAiLensers(),
  rowId: (row) => String(row.ai_lenser_id ?? row.profile_id),
  toCells: (row) => ({
    handle: `@${row.handle}`,
    display_name: row.display_name ?? '—',
    status: fmtBool(row.is_active),
    created_at: fmtDate(row.created_at),
  }),
  detailFields: [
    { label: 'Handle', get: (row) => `@${row.handle}` },
    { label: 'Display name', get: (row) => row.display_name ?? '—' },
    { label: 'Status', get: (row) => fmtBool(row.is_active) },
    { label: 'Runtime', get: (row) => row.runtime_pref ?? '—' },
    { label: 'Created', get: (row) => fmtDate(row.created_at) },
  ],
  emptyMessage: 'No agents yet.',
  emptyHint: 'Create one with "lf lenser ai connect" or the command palette.',
  actions: [
    {
      key: 'p',
      label: 'Pause',
      visible: (row) => !!row.is_active,
      buildArgv: (row) => ['lenser', 'pause', row.handle],
      confirm: {
        title: 'Pause agent',
        description: (row) => `New runs for @${row.handle} will be blocked until resumed.`,
        risk: 'MEDIUM',
        confirmLabel: 'Pause',
      },
    },
    {
      key: 'r',
      label: 'Resume',
      visible: (row) => !row.is_active,
      buildArgv: (row) => ['lenser', 'resume', row.handle],
      confirm: {
        title: 'Resume agent',
        description: (row) => `@${row.handle} will accept new runs again.`,
        risk: 'LOW',
        confirmLabel: 'Resume',
      },
    },
  ],
}

export const LENSERS_CONFIG: DomainListConfig = {
  id: 'lensers',
  title: 'Lensers',
  columns: [
    { key: 'handle', label: 'HANDLE', width: 20 },
    { key: 'display_name', label: 'NAME', width: 24 },
    { key: 'type', label: 'TYPE', width: 10 },
    { key: 'status', label: 'STATUS', width: 12, status: true },
  ],
  fetch: async () => await listLensers('all'),
  rowId: (row) => String(row.profile_id),
  toCells: (row) => ({
    handle: `@${row.handle}`,
    display_name: row.display_name ?? '—',
    type: row.type,
    status: fmtBool(row.is_active ?? true),
  }),
  detailFields: [
    { label: 'Handle', get: (row) => `@${row.handle}` },
    { label: 'Display name', get: (row) => row.display_name ?? '—' },
    { label: 'Type', get: (row) => row.type },
    { label: 'Created', get: (row) => fmtDate(row.created_at) },
  ],
  emptyMessage: 'No lensers found.',
  actions: [],
}

export const APPROVALS_CONFIG: DomainListConfig = {
  id: 'approvals',
  title: 'Approvals',
  columns: [
    { key: 'id', label: 'REQUEST', width: 14 },
    { key: 'approval_status', label: 'STATUS', width: 14, status: true },
    { key: 'status', label: 'RUN STATUS', width: 14 },
    { key: 'created_at', label: 'CREATED', width: 22 },
  ],
  fetch: async () => await listApprovalRequests({ limit: 50 }),
  rowId: (row) => String(row.id),
  toCells: (row) => ({
    id: String(row.id).slice(0, 8),
    approval_status: row.approval_status,
    status: row.status,
    created_at: fmtDate(row.created_at),
  }),
  detailFields: [
    { label: 'Request ID', get: (row) => row.id },
    { label: 'Approval status', get: (row) => row.approval_status },
    { label: 'Run status', get: (row) => row.status },
    { label: 'Workflow', get: (row) => row.workflow_id ?? '—' },
    { label: 'Created', get: (row) => fmtDate(row.created_at) },
  ],
  emptyMessage: 'No approval requests.',
  emptyHint: 'Requests appear here when a workflow hits an approval gate.',
  actions: [
    {
      key: 'a',
      label: 'Approve',
      visible: (row) => row.approval_status === 'pending',
      buildArgv: (row) => ['approval', 'approve', row.id],
      confirm: {
        title: 'Approve request',
        description: (row) => `Approve request ${String(row.id).slice(0, 8)} and let the workflow continue.`,
        risk: 'MEDIUM',
        confirmLabel: 'Approve',
      },
    },
    {
      key: 'j',
      label: 'Reject',
      visible: (row) => row.approval_status === 'pending',
      buildArgv: (row) => ['approval', 'reject', row.id],
      confirm: {
        title: 'Reject request',
        description: (row) => `Reject request ${String(row.id).slice(0, 8)}. This stops the workflow run.`,
        risk: 'HIGH',
        confirmLabel: 'Reject',
      },
    },
  ],
}

export const SCHEDULES_CONFIG: DomainListConfig = {
  id: 'schedules',
  title: 'Schedules',
  columns: [
    { key: 'workflow_title', label: 'WORKFLOW', width: 22 },
    { key: 'cron_expr', label: 'CRON', width: 14 },
    { key: 'status', label: 'STATUS', width: 12, status: true },
    { key: 'next_run_at', label: 'NEXT RUN', width: 22 },
  ],
  fetch: async () => await listSchedules(),
  rowId: (row) => String(row.id),
  toCells: (row) => ({
    workflow_title: row.workflow_title ?? row.workflow_id,
    cron_expr: row.cron_expr,
    status: row.is_active ? 'active' : (row.last_dispatch_status === 'failed' ? 'failed' : 'paused'),
    next_run_at: fmtDate(row.next_run_at),
  }),
  detailFields: [
    { label: 'Workflow', get: (row) => row.workflow_title ?? row.workflow_id },
    { label: 'Cron', get: (row) => `${row.cron_expr} (${row.timezone})` },
    { label: 'Last run', get: (row) => fmtDate(row.last_run_at) },
    { label: 'Last status', get: (row) => row.last_dispatch_status ?? '—' },
    { label: 'Last error', get: (row) => row.last_error_message ?? '—' },
  ],
  emptyMessage: 'No schedules configured.',
  actions: [
    {
      key: 'p',
      label: 'Pause',
      visible: (row) => !!row.is_active,
      buildArgv: (row) => ['schedule', 'pause', row.id],
      confirm: {
        title: 'Pause schedule',
        description: () => 'The workflow will no longer trigger on its cron schedule until resumed.',
        risk: 'MEDIUM',
        confirmLabel: 'Pause',
      },
    },
    {
      key: 'r',
      label: 'Resume',
      visible: (row) => !row.is_active,
      buildArgv: (row) => ['schedule', 'resume', row.id],
      confirm: {
        title: 'Resume schedule',
        description: () => 'The schedule will resume triggering on its cron expression.',
        risk: 'LOW',
        confirmLabel: 'Resume',
      },
    },
    {
      key: 'x',
      label: 'Delete',
      buildArgv: (row) => ['schedule', 'delete', row.id, '--force'],
      confirm: {
        title: 'Delete schedule',
        description: () => 'This permanently deletes the schedule. This cannot be undone.',
        risk: 'HIGH',
        confirmLabel: 'Delete',
      },
    },
  ],
}

export const LOGS_CONFIG: DomainListConfig = {
  id: 'logs',
  title: 'Logs',
  columns: [
    { key: 'created_at', label: 'TIME', width: 22 },
    { key: 'action_type', label: 'EVENT', width: 24 },
    { key: 'ai_lenser_id', label: 'AGENT', width: 14 },
  ],
  fetch: async () => {
    const feed = await getHumanActivityFeed(50)
    return feed as unknown as DomainRow[]
  },
  rowId: (row, index) => String(row.id ?? `${row.occurred_at}-${index}`),
  toCells: (row) => ({
    created_at: fmtDate(row.occurred_at),
    action_type: row.action_type ?? row.kind ?? '—',
    ai_lenser_id: row.ai_lenser_id ? String(row.ai_lenser_id).slice(0, 8) : '—',
  }),
  detailFields: [
    { label: 'Event', get: (row) => row.action_type ?? row.kind ?? '—' },
    { label: 'Agent', get: (row) => row.ai_lenser_id ?? '—' },
    { label: 'Team run', get: (row) => row.team_run_id ?? '—' },
    { label: 'Occurred', get: (row) => fmtDate(row.occurred_at) },
  ],
  emptyMessage: 'No activity yet — waiting for events…',
  actions: [],
}

async function fetchDefaultMemoryEntries(): Promise<DomainRow[]> {
  const ctx = getAgentWorkspaceContext()
  if (!ctx) return []
  const profiles = await listMemoryProfiles(ctx.aiLenserId)
  const defaultProfile = profiles.find((p) => p.is_default) ?? profiles[0]
  if (!defaultProfile) return []
  const entries = await readMemoryEntries(defaultProfile.id)
  return entries as unknown as DomainRow[]
}

export const MEMORY_CONFIG: DomainListConfig = {
  id: 'memory',
  title: 'Memory',
  columns: [
    { key: 'created_at', label: 'TIME', width: 20 },
    { key: 'scope', label: 'SCOPE', width: 12 },
    { key: 'source', label: 'SOURCE', width: 14 },
    { key: 'content', label: 'CONTENT', width: 40 },
  ],
  fetch: fetchDefaultMemoryEntries,
  rowId: (row) => String(row.id),
  toCells: (row) => ({
    created_at: fmtDate(row.created_at),
    scope: row.scope,
    source: row.source,
    content: row.is_redacted ? '[REDACTED]' : String(row.content ?? '').slice(0, 60),
  }),
  detailFields: [
    { label: 'Scope', get: (row) => row.scope },
    { label: 'Source', get: (row) => row.source },
    { label: 'Confidence', get: (row) => String(row.confidence ?? '—') },
    { label: 'Content', get: (row) => (row.is_redacted ? '[REDACTED]' : String(row.content ?? '')) },
  ],
  emptyMessage: 'No memory entries for the active agent.',
  emptyHint: 'Select an agent first: "lf agents use <handle>", or run "lf memory create-profile".',
  actions: [],
}

export const DOMAIN_LIST_CONFIGS: Record<string, DomainListConfig> = {
  agents: AGENTS_CONFIG,
  lensers: LENSERS_CONFIG,
  approvals: APPROVALS_CONFIG,
  schedules: SCHEDULES_CONFIG,
  logs: LOGS_CONFIG,
  memory: MEMORY_CONFIG,
}

export function getDomainListConfig(id: DomainId): DomainListConfig | null {
  return DOMAIN_LIST_CONFIGS[id] ?? null
}
