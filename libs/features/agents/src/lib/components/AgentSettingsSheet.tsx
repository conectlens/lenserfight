import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService, agentsService } from '@lenserfight/data/repositories'
import type { AgentProfileView } from '@lenserfight/data/repositories'
import { Drawer } from '@lenserfight/ui/overlays'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Bot,
  Download,
  ExternalLink,
  Save,
  Trash2,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

import type {
  ApprovalDefault,
  WorkspaceSettingsRecord,
} from '@lenserfight/types'

const APPROVAL_OPTIONS: ApprovalDefault[] = ['auto', 'require_human', 'deny']

type Tab = 'identity' | 'runtime' | 'advanced'

interface Props {
  open: boolean
  onClose: () => void
  profileId: string
  handle: string
}

export const AgentSettingsSheet: React.FC<Props> = ({
  open,
  onClose,
  profileId,
  handle,
}) => {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('identity')

  const agentQuery = useQuery<AgentProfileView | null>({
    queryKey: queryKeys.agents.detailByProfile(profileId),
    queryFn: () => agentsService.getAgentProfileByProfileId(profileId),
    enabled: open && !!profileId,
    staleTime: 60_000,
  })
  const agent = agentQuery.data ?? null

  const settingsQuery = useQuery<WorkspaceSettingsRecord | null>({
    queryKey: queryKeys.agents.workspaceSettings(agent?.ai_lenser_id ?? ''),
    queryFn: () => agentWorkspaceService.getWorkspaceSettings(agent!.ai_lenser_id),
    enabled: open && !!agent?.ai_lenser_id,
    staleTime: 30_000,
  })

  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [headline, setHeadline] = useState('')
  const [bio, setBio] = useState('')
  const [approvalDefault, setApprovalDefault] = useState<ApprovalDefault>('require_human')
  const [retentionDays, setRetentionDays] = useState(90)
  const [maxDailyCredits, setMaxDailyCredits] = useState(1000)
  const [apiAccessEnabled, setApiAccessEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!agent) return
    setDisplayName(agent.display_name ?? '')
    setAvatarUrl('')
    setHeadline('')
    setBio('')
  }, [agent])

  useEffect(() => {
    const s = settingsQuery.data
    if (!s) return
    setApprovalDefault(s.approval_default)
    setRetentionDays(s.retention_days)
    setMaxDailyCredits(s.max_daily_credits)
    setApiAccessEnabled(s.api_access_enabled)
  }, [settingsQuery.data])

  const saveIdentity = useMutation({
    mutationFn: () =>
      agentsService.updateAgentProfile(agent!.ai_lenser_id, {
        display_name: displayName,
        avatar_url: avatarUrl || null,
        headline: headline || null,
        bio: bio || null,
      }),
    onSuccess: async () => {
      setOkMsg('Agent profile saved.')
      setError(null)
      toast.success('Agent identity updated')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.agents.detailByProfile(profileId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.lenser.profile(handle) }),
      ])
    },
    onError: (cause) => setError((cause as Error).message ?? 'Failed to save.'),
  })

  const saveRuntime = useMutation({
    mutationFn: () =>
      agentWorkspaceService.updateWorkspaceSettings(agent!.ai_lenser_id, {
        approval_default: approvalDefault,
        retention_days: retentionDays,
        max_daily_credits: maxDailyCredits,
        api_access_enabled: apiAccessEnabled,
      }),
    onSuccess: async () => {
      setOkMsg('Runtime settings saved.')
      setError(null)
      toast.success('Runtime settings updated')
      await queryClient.invalidateQueries({
        queryKey: queryKeys.agents.workspaceSettings(agent!.ai_lenser_id),
      })
    },
    onError: (cause) => setError((cause as Error).message ?? 'Failed to save.'),
  })

  const exportBundle = useMutation({
    mutationFn: () => agentWorkspaceService.exportWorkspace(agent!.ai_lenser_id),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${handle}-workspace-export.json`
      a.click()
      URL.revokeObjectURL(url)
    },
    onError: (cause) => setError((cause as Error).message ?? 'Export failed.'),
  })

  const requestDeletion = useMutation({
    mutationFn: (reason: string) =>
      agentWorkspaceService.requestWorkspaceDeletion(agent!.ai_lenser_id, reason),
    onSuccess: () => {
      toast.success('Deletion request submitted. An admin will review.')
      setOkMsg('Deletion requested.')
    },
    onError: (cause) => setError((cause as Error).message ?? 'Deletion request failed.'),
  })

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'identity', label: 'Identity' },
    { id: 'runtime', label: 'Runtime' },
    { id: 'advanced', label: 'Advanced' },
  ]

  const isLoading = agentQuery.isLoading

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="w-[560px]"
      title={`@${handle} — Agent Settings`}
    >
      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          Loading agent settings…
        </div>
      ) : !agent ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Bot size={28} className="text-gray-300 dark:text-gray-600" />
          <p>Could not load agent settings.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
            <Bot size={16} className="flex-shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {agent.display_name || `@${handle}`}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                @{handle} · {agent.runtime_pref}
              </p>
            </div>
            <a
              href={`/lenser/${handle}/ag/settings`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400"
              title="Open full settings page"
            >
              <ExternalLink size={14} />
            </a>
          </div>

          <div className="flex gap-1 border-b border-gray-200 pb-1 dark:border-gray-700">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                  tab === t.id
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {(error || okMsg) && (
            <div className="space-y-2">
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
            </div>
          )}

          {tab === 'identity' && (
            <div className="space-y-4">
              <SheetField label="Display name">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClass}
                />
              </SheetField>
              <SheetField label="Avatar URL">
                <input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </SheetField>
              <SheetField label="Headline">
                <input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className={inputClass}
                />
              </SheetField>
              <SheetField label="Bio">
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className={`${inputClass} resize-none`}
                />
              </SheetField>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => saveIdentity.mutate()}
                  disabled={saveIdentity.isPending || !agent}
                  className={primaryBtn}
                >
                  <Save size={14} />
                  {saveIdentity.isPending ? 'Saving…' : 'Save identity'}
                </button>
                <a
                  href={`/lenser/${handle}/ag/instructions`}
                  className={secondaryBtn}
                >
                  Manage instructions
                </a>
                <a
                  href={`/lenser/${handle}/ag/models`}
                  className={secondaryBtn}
                >
                  Manage models
                </a>
              </div>
            </div>
          )}

          {tab === 'runtime' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300">
                Runtime pref: <span className="font-semibold text-gray-900 dark:text-white">{agent.runtime_pref}</span>
                {' · '}Mode: <span className="font-semibold text-gray-900 dark:text-white">{agent.model_binding_mode}</span>
              </div>
              <SheetField label="Approval default">
                <select
                  value={approvalDefault}
                  onChange={(e) => setApprovalDefault(e.target.value as ApprovalDefault)}
                  className={inputClass}
                >
                  {APPROVAL_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </SheetField>
              <div className="grid grid-cols-2 gap-3">
                <SheetField label="Retention (days)">
                  <input
                    type="number"
                    min={1}
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                    className={inputClass}
                  />
                </SheetField>
                <SheetField label="Max daily credits">
                  <input
                    type="number"
                    min={0}
                    value={maxDailyCredits}
                    onChange={(e) => setMaxDailyCredits(Number(e.target.value))}
                    className={inputClass}
                  />
                </SheetField>
              </div>
              <label className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
                <input
                  type="checkbox"
                  checked={apiAccessEnabled}
                  onChange={(e) => setApiAccessEnabled(e.target.checked)}
                />
                <span>External API access enabled</span>
              </label>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => saveRuntime.mutate()}
                  disabled={saveRuntime.isPending || !agent}
                  className={primaryBtn}
                >
                  <Save size={14} />
                  {saveRuntime.isPending ? 'Saving…' : 'Save runtime'}
                </button>
                <a
                  href={`/lenser/${handle}/ag/providers`}
                  className={secondaryBtn}
                >
                  API keys & providers
                </a>
              </div>
            </div>
          )}

          {tab === 'advanced' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Export a full workspace snapshot or request workspace deletion. Deletion is gated behind admin review.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => exportBundle.mutate()}
                  disabled={exportBundle.isPending || !agent}
                  className={secondaryBtn}
                >
                  <Download size={14} />
                  {exportBundle.isPending ? 'Exporting…' : 'Export workspace'}
                </button>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Danger zone</p>
                  <p className="mt-1 text-xs leading-5">
                    Submits a deletion request. An admin must confirm before data is removed.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const reason = window.prompt('Reason for deletion?') ?? ''
                      if (reason) requestDeletion.mutate(reason)
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-2xl border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:bg-gray-900 dark:hover:bg-red-500/20"
                  >
                    <Trash2 size={12} />
                    Request deletion
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const primaryBtn =
  'inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900'

const secondaryBtn =
  'inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200'

const SheetField: React.FC<{ label: string; children: React.ReactNode }> = ({
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
