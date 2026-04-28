import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Download, Save, Trash2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'

import { ProfileCard, formatDateTime } from './_shared'
import { SectionPage } from './SectionPage'

import type {
  ApprovalDefault,
  WorkspaceSettingsRecord,
} from '@lenserfight/types'

const APPROVAL_OPTIONS: ApprovalDefault[] = [
  'auto',
  'require_human',
  'deny',
]

export const SettingsSection: React.FC = () => {
  const { profile, agentProfile, bootstrap, viewMode } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const isAgentOwner = viewMode === 'agent_owner'

  const settingsQuery = useQuery<WorkspaceSettingsRecord | null>({
    queryKey: queryKeys.agents.workspaceSettings(bootstrap?.ai_lenser_id ?? ''),
    queryFn: () =>
      agentWorkspaceService.getWorkspaceSettings(bootstrap!.ai_lenser_id),
    enabled: isAgentOwner && !!bootstrap?.ai_lenser_id,
    staleTime: 30_000,
  })

  const [approvalDefault, setApprovalDefault] =
    useState<ApprovalDefault>('require_human')
  const [retentionDays, setRetentionDays] = useState(90)
  const [maxDailyCredits, setMaxDailyCredits] = useState(1000)
  const [apiAccessEnabled, setApiAccessEnabled] = useState(false)
  const [webhooksJson, setWebhooksJson] = useState('[]')
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  useEffect(() => {
    const s = settingsQuery.data
    if (!s) return
    setApprovalDefault(s.approval_default)
    setRetentionDays(s.retention_days)
    setMaxDailyCredits(s.max_daily_credits)
    setApiAccessEnabled(s.api_access_enabled)
    setWebhooksJson(JSON.stringify(s.webhooks ?? [], null, 2))
  }, [settingsQuery.data])

  const save = useMutation({
    mutationFn: () => {
      let webhooks
      try {
        webhooks = JSON.parse(webhooksJson || '[]')
      } catch {
        throw new Error('Webhooks must be valid JSON array')
      }
      return agentWorkspaceService.updateWorkspaceSettings(
        bootstrap!.ai_lenser_id,
        {
          approval_default: approvalDefault,
          retention_days: retentionDays,
          max_daily_credits: maxDailyCredits,
          api_access_enabled: apiAccessEnabled,
          webhooks,
        }
      )
    },
    onSuccess: () => {
      setOkMsg('Settings saved.')
      setError(null)
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.workspaceSettings(
          bootstrap!.ai_lenser_id
        ),
      })
    },
    onError: (err) => setError((err as Error).message ?? 'Save failed'),
  })

  const exportBundle = useMutation({
    mutationFn: () =>
      agentWorkspaceService.exportWorkspace(bootstrap!.ai_lenser_id),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${profile.handle}-workspace-export.json`
      a.click()
      URL.revokeObjectURL(url)
    },
    onError: (err) => setError((err as Error).message ?? 'Export failed'),
  })

  const requestDeletion = useMutation({
    mutationFn: (reason: string) =>
      agentWorkspaceService.requestWorkspaceDeletion(
        bootstrap!.ai_lenser_id,
        reason
      ),
    onSuccess: () => setOkMsg('Deletion requested. An admin will review.'),
    onError: (err) => setError((err as Error).message ?? 'Request failed'),
  })

  return (
    <SectionPage
      eyebrow="Settings"
      title="Workspace settings"
      description="Operational configuration for this workspace. Settings define defaults; explicit per-team or per-workflow overrides still win."
    >
      <ProfileCard
        title="Workspace identity"
        subtitle="Read-only summary."
      >
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <Row label="Workspace handle" value={`@${profile.handle}`} />
          <Row label="Profile type" value={profile.type ?? 'unknown'} />
          <Row
            label="Agent runtime"
            value={agentProfile?.runtime_pref ?? 'unknown'}
          />
          <Row
            label="Last refresh"
            value={formatDateTime(new Date().toISOString())}
          />
        </div>
      </ProfileCard>

      {!isAgentOwner ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Settings can only be edited by the agent's owner.
        </p>
      ) : !bootstrap ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Workspace bootstrap not loaded yet.
        </p>
      ) : (
        <>
          <ProfileCard
            title="Defaults"
            subtitle="These defaults apply to new schedules, workflows, and team runs unless explicitly overridden."
          >
            <div className="space-y-4">
              <Field label="Approval default">
                <select
                  value={approvalDefault}
                  onChange={(e) =>
                    setApprovalDefault(e.target.value as ApprovalDefault)
                  }
                  className={inputClass}
                >
                  {APPROVAL_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Retention (days)">
                  <input
                    type="number"
                    min={1}
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Max daily credits">
                  <input
                    type="number"
                    min={0}
                    value={maxDailyCredits}
                    onChange={(e) => setMaxDailyCredits(Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
                <input
                  type="checkbox"
                  checked={apiAccessEnabled}
                  onChange={(e) => setApiAccessEnabled(e.target.checked)}
                />
                <span>External API access enabled</span>
              </label>
              <Field label="Webhooks (JSON array)">
                <textarea
                  rows={4}
                  value={webhooksJson}
                  onChange={(e) => setWebhooksJson(e.target.value)}
                  className={`${inputClass} resize-none font-mono text-xs`}
                  placeholder='[{"url":"https://..."}]'
                />
              </Field>
              {error && (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                  {error}
                </p>
              )}
              {okMsg && (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  {okMsg}
                </p>
              )}
              <button
                type="button"
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
              >
                <Save size={16} />
                {save.isPending ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          </ProfileCard>

          <ProfileCard
            title="Backup and export"
            subtitle="Export an immutable JSON snapshot of teams, profiles, settings, and tool assignments for this workspace."
          >
            <button
              type="button"
              onClick={() => exportBundle.mutate()}
              disabled={exportBundle.isPending}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
            >
              <Download size={16} />
              {exportBundle.isPending ? 'Exporting…' : 'Export workspace'}
            </button>
          </ProfileCard>

          <ProfileCard
            title="Danger zone"
            subtitle="Request deletion flags this workspace for admin review. It does not immediately delete data."
          >
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Request workspace deletion</p>
                <p className="mt-1 text-xs">
                  Submits a deletion request. You will need an admin to confirm
                  before any data is removed.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const reason = prompt('Reason for deletion?') ?? ''
                    if (reason) requestDeletion.mutate(reason)
                  }}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:bg-gray-900 dark:hover:bg-red-500/20"
                >
                  <Trash2 size={14} />
                  Request deletion
                </button>
              </div>
            </div>
          </ProfileCard>
        </>
      )}
    </SectionPage>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
      {label}
    </span>
    {children}
  </label>
)

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span>{label}</span>
    <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
  </div>
)
