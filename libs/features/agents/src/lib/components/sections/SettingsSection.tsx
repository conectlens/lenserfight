import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService, agentsService } from '@lenserfight/data/repositories'
import { Button } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Download, Pause, Play, Save, ShieldOff, Trash2 } from 'lucide-react'
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

type Tab = 'identity' | 'runtime' | 'governance' | 'export'

const TAB_LABELS: Record<Tab, string> = {
  identity: 'Identity',
  runtime: 'Runtime',
  governance: 'Governance',
  export: 'Export & Danger',
}

export const SettingsSection: React.FC = () => {
  const { profile, agentProfile, bootstrap, bootstrapState, viewMode } =
    useAgentWorkspace()
  const queryClient = useQueryClient()
  const isAgentOwner = viewMode === 'agent_owner'

  const [tab, setTab] = useState<Tab>('identity')

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
  // Phase 8: governance controls
  const [maxParallelRuns, setMaxParallelRuns] = useState(5)
  const [globalKillSwitch, setGlobalKillSwitch] = useState(false)
  const [agentPaused, setAgentPaused] = useState(false)
  const [darkLaunchEnabled, setDarkLaunchEnabled] = useState(false)
  const [darkLaunchPct, setDarkLaunchPct] = useState(0)
  const [budgetEnforce, setBudgetEnforce] = useState(true)
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
    setMaxParallelRuns(settings.max_parallel_runs ?? 5)
    setGlobalKillSwitch(settings.global_kill_switch ?? false)
    setAgentPaused(settings.runner_paused ?? settings.agent_paused ?? false)
    setDarkLaunchEnabled(settings.dark_launch_enabled ?? false)
    setDarkLaunchPct(settings.dark_launch_pct ?? 0)
    setBudgetEnforce(settings.budget_enforce ?? true)
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

  const saveGovernance = useMutation({
    mutationFn: () =>
      agentWorkspaceService.updateWorkspaceSettings(bootstrap!.ai_lenser_id, {
        max_parallel_runs: maxParallelRuns,
        global_kill_switch: globalKillSwitch,
        runner_paused: agentPaused,
        dark_launch_enabled: darkLaunchEnabled,
        dark_launch_pct: darkLaunchPct,
        budget_enforce: budgetEnforce,
      }),
    onSuccess: async () => {
      setOkMsg('Governance settings saved.')
      setError(null)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.agents.workspaceSettings(bootstrap!.ai_lenser_id),
      })
    },
    onError: (cause) =>
      setError((cause as Error).message ?? 'Failed to save governance settings.'),
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
      docsPath="/how-to/agents/workspace/settings"
      docsTip="Identity, runtime defaults, governance, and export & danger zone. Four tabs in one place — see Manage Agent Settings for field-by-field detail."
      title="Selected agent management"
      description="Manage the selected AI lenser as a concrete product surface: identity, runtime defaults, export, and deletion controls all live here instead of being duplicated on the overview page."
    >
      <BootstrapStatusPanel state={bootstrapState} />

      {!isAgentOwner ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Settings can only be edited by the agent owner.
        </p>
      ) : bootstrap ? (
        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          <div className="w-full flex-shrink-0 space-y-1 md:w-48">
            {(['identity', 'runtime', 'governance', 'export'] as const).map((t) => (
              <Button
                key={t}
                variant='ghost'
                type="button"
                onClick={() => setTab(t)}
                className={
                  tab === t
                    ? 'w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                    : 'w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                }
              >
                {TAB_LABELS[t]}
              </Button>
            ))}
          </div>

          <div className="flex-1 space-y-6">
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

            {tab === 'identity' && (
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
                  <Button
                    type="button"
                    onClick={() => saveIdentity.mutate()}
                    disabled={saveIdentity.isPending}
                    isLoading={saveIdentity.isPending}
                  >
                    <Save size={16} />
                    {saveIdentity.isPending ? 'Saving...' : 'Save identity'}
                  </Button>
                </div>
              </ProfileCard>
            )}

            {tab === 'runtime' && (
              <ProfileCard
                title="Runtime and defaults"
                subtitle="Execution defaults apply unless a workflow or builder assignment overrides them."
              >
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    Runtime preference:{' '}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {agentProfile?.runtime_pref ?? 'unknown'}
                    </span>
                  </div>

                  <Field label="Approval default">
                    <SelectField
                      value={approvalDefault}
                      onChange={(value) =>
                        setApprovalDefault(value as ApprovalDefault)
                      }
                      options={APPROVAL_OPTIONS.map((option) => ({
                        value: option,
                        label: option,
                      }))}
                    />
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

                  <Button
                    type="button"
                    onClick={() => saveDefaults.mutate()}
                    disabled={saveDefaults.isPending}
                    isLoading={saveDefaults.isPending}
                  >
                    <Save size={16} />
                    {saveDefaults.isPending ? 'Saving...' : 'Save defaults'}
                  </Button>
                </div>
              </ProfileCard>
            )}

            {tab === 'governance' && (
              <div className="space-y-6">
                {globalKillSwitch && (
                  <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
                    <ShieldOff size={18} className="flex-shrink-0" />
                    <span className="flex-1 font-medium">Kill switch is active — new runs are blocked.</span>
                  </div>
                )}
                {agentPaused && !globalKillSwitch && (
                  <div className="flex items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100">
                    <Pause size={18} className="flex-shrink-0" />
                    <span className="flex-1 font-medium">Agent is paused — new runs will be queued but not started.</span>
                  </div>
                )}

                <ProfileCard
                  title="Lifecycle controls"
                  subtitle="Immediately stop or pause this agent. Changes take effect on the next policy evaluation."
                >
                  <div className="space-y-4">
                    <ToggleRow
                      label="Global kill switch"
                      description="Deny all new run start attempts. Active runs are not cancelled automatically."
                      checked={globalKillSwitch}
                      onChange={setGlobalKillSwitch}
                      danger
                    />
                    <ToggleRow
                      label="Agent paused"
                      description="Pause this agent so runs queue but do not start."
                      checked={agentPaused}
                      onChange={setAgentPaused}
                    />
                  </div>
                </ProfileCard>

                <ProfileCard
                  title="Budget & concurrency"
                  subtitle="Enforce spending limits and cap how many runs can be active simultaneously."
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Max parallel runs">
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={maxParallelRuns}
                          onChange={(event) => setMaxParallelRuns(Number(event.target.value))}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Max daily credits">
                        <input
                          type="number"
                          min={0}
                          value={maxDailyCredits}
                          onChange={(event) => setMaxDailyCredits(Number(event.target.value))}
                          className={inputClass}
                        />
                      </Field>
                    </div>
                    <ToggleRow
                      label="Enforce budget ceiling"
                      description="Block new runs when daily credits reach the max daily credits limit."
                      checked={budgetEnforce}
                      onChange={setBudgetEnforce}
                    />
                  </div>
                </ProfileCard>

                <ProfileCard
                  title="Dark launch"
                  subtitle="Gate workflow execution to a percentage of runs using deterministic routing. Same workflow always in or out of the window."
                >
                  <div className="space-y-4">
                    <ToggleRow
                      label="Dark launch enabled"
                      description="Only allow runs matching the percentage window to start."
                      checked={darkLaunchEnabled}
                      onChange={setDarkLaunchEnabled}
                    />
                    {darkLaunchEnabled && (
                      <Field label={`Rollout percentage: ${darkLaunchPct}%`}>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={darkLaunchPct}
                          onChange={(event) => setDarkLaunchPct(Number(event.target.value))}
                          className="w-full accent-primary-yellow-500"
                        />
                        <div className="mt-1 flex justify-between text-xs text-gray-400">
                          <span>0%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                      </Field>
                    )}
                  </div>
                </ProfileCard>

                <Button
                  type="button"
                  onClick={() => saveGovernance.mutate()}
                  disabled={saveGovernance.isPending}
                  isLoading={saveGovernance.isPending}
                >
                  <Save size={16} />
                  {saveGovernance.isPending ? 'Saving...' : 'Save governance'}
                </Button>
              </div>
            )}

            {tab === 'export' && (
              <div className="space-y-6">
                <ProfileCard
                  title="Export"
                  subtitle="Export an immutable JSON snapshot of teams, bindings, policies, settings, and assignments."
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => exportBundle.mutate()}
                    disabled={exportBundle.isPending}
                    isLoading={exportBundle.isPending}
                  >
                    <Download size={16} />
                    {exportBundle.isPending ? 'Exporting...' : 'Export workspace'}
                  </Button>
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
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          const reason = prompt('Reason for deletion?') ?? ''
                          if (reason) requestDeletion.mutate(reason)
                        }}
                        className="mt-3"
                      >
                        <Trash2 size={14} />
                        Request deletion
                      </Button>
                    </div>
                  </div>
                </ProfileCard>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </SectionPage>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-yellow-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

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

const ToggleRow: React.FC<{
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
  danger?: boolean
}> = ({ label, description, checked, onChange, danger }) => (
  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 px-3 py-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50">
    <div className="relative mt-0.5 flex-shrink-0">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div
        className={[
          'h-5 w-9 rounded-full transition-colors',
          checked
            ? danger
              ? 'bg-red-500'
              : 'bg-primary-yellow-500'
            : 'bg-gray-300 dark:bg-gray-600',
        ].join(' ')}
      />
      <div
        className={[
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        ].join(' ')}
      />
    </div>
    <div className="flex-1 min-w-0">
      <span className={['text-sm font-medium', danger && checked ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'].join(' ')}>
        {label}
      </span>
      {description && (
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
  </label>
)
