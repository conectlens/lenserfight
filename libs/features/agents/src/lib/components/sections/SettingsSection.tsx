import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService, agentsService } from '@lenserfight/data/repositories'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Download, Save, Trash2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { BootstrapStatusPanel } from '../BootstrapStatusPanel'

import { ProfileCard } from './_shared'
import { SectionPage } from './SectionPage'

import type {
  ApprovalDefault,
  WorkspaceSettingsRecord,
} from '@lenserfight/types'

const APPROVAL_OPTIONS: ApprovalDefault[] = ['auto', 'require_human', 'deny']

export const SettingsSection: React.FC = () => {
  const { profile, agentProfile, bootstrap, bootstrapState, viewMode } =
    useAgentWorkspace()
  const queryClient = useQueryClient()
  const isAgentOwner = viewMode === 'agent_owner'

  const settingsQuery = useQuery<WorkspaceSettingsRecord | null>({
    queryKey: queryKeys.agents.workspaceSettings(bootstrap?.ai_lenser_id ?? ''),
    queryFn: () =>
      agentWorkspaceService.getWorkspaceSettings(bootstrap!.ai_lenser_id),
    enabled: isAgentOwner && !!bootstrap?.ai_lenser_id,
    staleTime: 30_000,
  })

  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [bannerUrl, setBannerUrl] = useState(profile.banner_url ?? '')
  const [headline, setHeadline] = useState(profile.headline ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')

  const [approvalDefault, setApprovalDefault] =
    useState<ApprovalDefault>('require_human')
  const [retentionDays, setRetentionDays] = useState(90)
  const [maxDailyCredits, setMaxDailyCredits] = useState(1000)
  const [apiAccessEnabled, setApiAccessEnabled] = useState(false)
  const [webhooksJson, setWebhooksJson] = useState('[]')
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  useEffect(() => {
    setDisplayName(profile.display_name ?? '')
    setAvatarUrl(profile.avatar_url ?? '')
    setBannerUrl(profile.banner_url ?? '')
    setHeadline(profile.headline ?? '')
    setBio(profile.bio ?? '')
  }, [
    profile.avatar_url,
    profile.banner_url,
    profile.bio,
    profile.display_name,
    profile.headline,
  ])

  useEffect(() => {
    const settings = settingsQuery.data
    if (!settings) return
    setApprovalDefault(settings.approval_default)
    setRetentionDays(settings.retention_days)
    setMaxDailyCredits(settings.max_daily_credits)
    setApiAccessEnabled(settings.api_access_enabled)
    setWebhooksJson(JSON.stringify(settings.webhooks ?? [], null, 2))
  }, [settingsQuery.data])

  const saveIdentity = useMutation({
    mutationFn: () =>
      agentsService.updateAgentProfile(bootstrap!.ai_lenser_id, {
        display_name: displayName,
        avatar_url: avatarUrl || null,
        banner_url: bannerUrl || null,
        headline: headline || null,
        bio: bio || null,
      }),
    onSuccess: async () => {
      setOkMsg('Agent profile saved.')
      setError(null)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.agents.detailByProfile(profile.id),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.lenser.profile(profile.handle),
        }),
      ])
    },
    onError: (cause) =>
      setError((cause as Error).message ?? 'Failed to save agent profile.'),
  })

  const saveDefaults = useMutation({
    mutationFn: () => {
      let webhooks
      try {
        webhooks = JSON.parse(webhooksJson || '[]')
      } catch {
        throw new Error('Webhooks must be a valid JSON array.')
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
    onSuccess: async () => {
      setOkMsg('Workspace defaults saved.')
      setError(null)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.agents.workspaceSettings(bootstrap!.ai_lenser_id),
      })
    },
    onError: (cause) =>
      setError((cause as Error).message ?? 'Failed to save workspace defaults.'),
  })

  const exportBundle = useMutation({
    mutationFn: () => agentWorkspaceService.exportWorkspace(bootstrap!.ai_lenser_id),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${profile.handle}-workspace-export.json`
      anchor.click()
      URL.revokeObjectURL(url)
    },
    onError: (cause) => setError((cause as Error).message ?? 'Export failed.'),
  })

  const requestDeletion = useMutation({
    mutationFn: (reason: string) =>
      agentWorkspaceService.requestWorkspaceDeletion(bootstrap!.ai_lenser_id, reason),
    onSuccess: () => {
      setOkMsg('Deletion requested. An admin will review the workspace.')
      setError(null)
    },
    onError: (cause) =>
      setError((cause as Error).message ?? 'Deletion request failed.'),
  })

  return (
    <SectionPage
      eyebrow="Settings"
      title="Selected agent management"
      description="Manage the selected AI lenser as a concrete product surface: identity, runtime defaults, export, and deletion controls all live here instead of being duplicated on the overview page."
    >
      <BootstrapStatusPanel state={bootstrapState} />

      {!isAgentOwner ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Settings can only be edited by the agent owner.
        </p>
      ) : bootstrap ? (
        <>
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <ProfileCard
              title="Identity"
              subtitle="Update how this AI lenser appears to owners and public viewers."
            >
              <div className="space-y-4">
                <Field label="Display name">
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Avatar URL">
                  <input
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </Field>
                <Field label="Banner URL">
                  <input
                    value={bannerUrl}
                    onChange={(event) => setBannerUrl(event.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </Field>
                <Field label="Headline">
                  <input
                    value={headline}
                    onChange={(event) => setHeadline(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Bio">
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    className={`${inputClass} resize-none`}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => saveIdentity.mutate()}
                  disabled={saveIdentity.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
                >
                  <Save size={16} />
                  {saveIdentity.isPending ? 'Saving...' : 'Save identity'}
                </button>
              </div>
            </ProfileCard>

            <ProfileCard
              title="Runtime and defaults"
              subtitle="Execution defaults apply unless a workflow or builder assignment overrides them."
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300">
                  Runtime preference: <span className="font-semibold text-gray-900 dark:text-white">{agentProfile?.runtime_pref ?? 'unknown'}</span>
                </div>

                <Field label="Approval default">
                  <select
                    value={approvalDefault}
                    onChange={(event) =>
                      setApprovalDefault(event.target.value as ApprovalDefault)
                    }
                    className={inputClass}
                  >
                    {APPROVAL_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
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
                      onChange={(event) => setRetentionDays(Number(event.target.value))}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Max daily credits">
                    <input
                      type="number"
                      min={0}
                      value={maxDailyCredits}
                      onChange={(event) =>
                        setMaxDailyCredits(Number(event.target.value))
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>

                <label className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
                  <input
                    type="checkbox"
                    checked={apiAccessEnabled}
                    onChange={(event) => setApiAccessEnabled(event.target.checked)}
                  />
                  <span>External API access enabled</span>
                </label>

                <Field label="Webhooks (JSON array)">
                  <textarea
                    rows={4}
                    value={webhooksJson}
                    onChange={(event) => setWebhooksJson(event.target.value)}
                    className={`${inputClass} resize-none font-mono text-xs`}
                    placeholder='[{"url":"https://..."}]'
                  />
                </Field>

                <button
                  type="button"
                  onClick={() => saveDefaults.mutate()}
                  disabled={saveDefaults.isPending}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
                >
                  <Save size={16} />
                  {saveDefaults.isPending ? 'Saving...' : 'Save defaults'}
                </button>
              </div>
            </ProfileCard>
          </div>

          {(error || okMsg) && (
            <div className="space-y-3">
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

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <ProfileCard
              title="Export"
              subtitle="Export an immutable JSON snapshot of teams, bindings, policies, settings, and assignments."
            >
              <button
                type="button"
                onClick={() => exportBundle.mutate()}
                disabled={exportBundle.isPending}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
              >
                <Download size={16} />
                {exportBundle.isPending ? 'Exporting...' : 'Export workspace'}
              </button>
            </ProfileCard>

            <ProfileCard
              title="Danger zone"
              subtitle="Deletion is gated behind admin review. It does not erase data immediately."
            >
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">Request workspace deletion</p>
                  <p className="mt-1 text-xs leading-5">
                    Submit a deletion request when this AI lenser should be removed
                    from service. An administrator must confirm before any data is
                    deleted.
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
          </div>
        </>
      ) : null}
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
