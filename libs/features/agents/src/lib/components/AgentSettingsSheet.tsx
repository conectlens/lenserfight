import { queryKeys } from '@lenserfight/data/cache'
import {
  agentWorkspaceService,
  agentsService,
  workflowsService,
  type AgentProfileView,
  type WorkflowRecord,
} from '@lenserfight/data/repositories'
import { Alert, Button, Card } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Drawer } from '@lenserfight/ui/overlays'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bot,
  CalendarClock,
  Download,
  Pencil,
  Save,
  Trash2,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ScheduleDrawer } from './drawers/ScheduleDrawer'

import type {
  ApprovalDefault,
  WorkflowScheduleRecord,
  WorkspaceSettingsRecord,
} from '@lenserfight/types'

const APPROVAL_OPTIONS: ApprovalDefault[] = ['auto', 'require_human', 'deny']

type Tab = 'identity' | 'runtime' | 'schedules' | 'personality' | 'advanced'

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

  const schedulesQuery = useQuery<WorkflowScheduleRecord[]>({
    queryKey: queryKeys.workflows.schedules(null),
    queryFn: () => workflowsService.getSchedules(),
    enabled: open && tab === 'schedules',
    staleTime: 30_000,
  })

  const agentSchedules = (schedulesQuery.data ?? []).filter(
    (s) => s.assignee_id === agent?.ai_lenser_id
  )

  const workflowsQuery = useQuery<WorkflowRecord[]>({
    queryKey: queryKeys.workflows.byLenser(agent?.owner_lenser_id ?? ''),
    queryFn: () => workflowsService.listByLenser(agent!.owner_lenser_id),
    enabled: open && tab === 'schedules' && !!agent?.owner_lenser_id,
    staleTime: 60_000,
  })

  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [headline, setHeadline] = useState('')
  const [bio, setBio] = useState('')
  const [approvalDefault, setApprovalDefault] = useState<ApprovalDefault>('require_human')
  const [retentionDays, setRetentionDays] = useState(90)
  const [maxDailyCredits, setMaxDailyCredits] = useState(1000)
  const [apiAccessEnabled, setApiAccessEnabled] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const [schedDrawerOpen, setSchedDrawerOpen] = useState(false)
  const [schedEditing, setSchedEditing] = useState<WorkflowScheduleRecord | null>(null)

  useEffect(() => {
    if (!agent) return
    setDisplayName(agent.display_name ?? '')
    setAvatarUrl('')
    setHeadline('')
    setBio('')
    setNoteText(agent.personality_note ?? '')
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

  const savePersonality = useMutation({
    mutationFn: () => agentsService.updatePersonality(agent!.ai_lenser_id, noteText || null),
    onSuccess: async () => {
      setOkMsg('Personality note saved.')
      setError(null)
      toast.success('Personality note updated')
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.detailByProfile(profileId) })
    },
    onError: (cause) => setError((cause as Error).message ?? 'Failed to save.'),
  })

  const togglePause = useMutation({
    mutationFn: (s: WorkflowScheduleRecord) =>
      workflowsService.upsertSchedule({
        workflow_id: s.workflow_id,
        schedule_id: s.id,
        cron_expr: s.cron_expr,
        timezone: s.timezone ?? 'UTC',
        is_active: !s.is_active,
        assignee_type: (s.assignee_type as 'agent' | 'team') ?? 'agent',
        assignee_id: s.assignee_id ?? null,
        inputs_template: s.inputs_template ?? {},
      }),
    onSuccess: (_, s) => {
      toast.success(s.is_active ? 'Schedule paused' : 'Schedule resumed')
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.schedules(null) })
    },
    onError: (e) => toast.error((e as Error).message),
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
    { id: 'schedules', label: 'Schedules' },
    { id: 'personality', label: 'Personality' },
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
          <Card className="flex items-center gap-3 !p-3 border-primary-yellow-200/80 bg-primary-yellow-50/60 dark:border-primary-yellow-500/20 dark:bg-primary-yellow-500/10">
            <Bot size={16} className="flex-shrink-0 text-primary-yellow-700 dark:text-primary-yellow-300" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {agent.display_name || `@${handle}`}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                @{handle} · {agent.runtime_pref}
              </p>
            </div>
          </Card>

          <div className="flex gap-1 border-b border-gray-200 pb-1 dark:border-gray-700">
            {tabs.map((t) => (
              <Button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${tab === t.id
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
              >
                {t.label}
              </Button>
            ))}
          </div>

          {(error || okMsg) && (
            <div className="space-y-2">
              {error && <Alert variant="error" title={error} />}
              {okMsg && <Alert variant="success" title={okMsg} />}
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
                <Button
                  type="button"
                  onClick={() => saveIdentity.mutate()}
                  disabled={saveIdentity.isPending || !agent}
                  isLoading={saveIdentity.isPending}
                >
                  <Save size={14} />
                  {saveIdentity.isPending ? 'Saving…' : 'Save identity'}
                </Button>
                <a href={`/lenser/${handle}/ag/instructions`} className={secondaryBtn}>
                  Manage instructions
                </a>
                <a href={`/lenser/${handle}/ag/models`} className={secondaryBtn}>
                  Manage models
                </a>
              </div>
            </div>
          )}

          {tab === 'runtime' && (
            <div className="space-y-4">
              <Card className="!p-3 text-sm text-gray-600 dark:text-gray-300">
                Runtime pref: <span className="font-semibold text-gray-900 dark:text-white">{agent.runtime_pref}</span>
                {' · '}Mode: <span className="font-semibold text-gray-900 dark:text-white">{agent.model_binding_mode}</span>
              </Card>
              <SheetField label="Approval default">
                <SelectField
                  value={approvalDefault}
                  onChange={(value) => setApprovalDefault(value as ApprovalDefault)}
                  options={APPROVAL_OPTIONS.map((option) => ({
                    value: option,
                    label: option,
                  }))}
                />
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
                <Button
                  type="button"
                  onClick={() => saveRuntime.mutate()}
                  disabled={saveRuntime.isPending || !agent}
                  isLoading={saveRuntime.isPending}
                >
                  <Save size={14} />
                  {saveRuntime.isPending ? 'Saving…' : 'Save runtime'}
                </Button>
                <a href={`/lenser/${handle}/ag/providers`} className={secondaryBtn}>
                  API keys & providers
                </a>
              </div>
            </div>
          )}

          {tab === 'schedules' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  CRON schedules assigned to this agent.
                </p>
                <Button
                  type="button"
                  onClick={() => { setSchedEditing(null); setSchedDrawerOpen(true) }}
                  disabled={(workflowsQuery.data ?? []).length === 0}
                >
                  <CalendarClock size={14} />
                  New schedule
                </Button>
              </div>
              {schedulesQuery.isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900" />
                  ))}
                </div>
              ) : agentSchedules.length === 0 ? (
                <Card className="flex flex-col items-center gap-2 !p-8 text-sm text-gray-500 dark:text-gray-400">
                  <CalendarClock size={22} className="text-gray-300 dark:text-gray-600" />
                  <p>No schedules assigned to this agent yet.</p>
                </Card>
              ) : (
                agentSchedules.map((s) => (
                  <Card key={s.id} className="!p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {s.workflow_title}
                        </p>
                        <p className="mt-1 font-mono text-xs text-gray-600 dark:text-gray-300">
                          {s.cron_expr}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`text-[11px] font-semibold ${s.is_active
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-gray-400'
                              }`}
                          >
                            {s.is_active ? 'Active' : 'Paused'}
                          </span>
                          <span className="text-[11px] text-gray-400">{s.timezone}</span>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 gap-1.5">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => togglePause.mutate(s)}
                        >
                          {s.is_active ? 'Pause' : 'Resume'}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => { setSchedEditing(s); setSchedDrawerOpen(true) }}
                          className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:text-primary-yellow-600 dark:border-gray-700 dark:text-gray-400"
                          aria-label="Edit schedule"
                        >
                          <Pencil size={13} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {tab === 'personality' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                The global personality note shapes every run for this agent. For per-workflow overrides, use personality profiles from the full workspace.
              </p>
              <SheetField label="Global personality note">
                <textarea
                  rows={6}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="e.g. You are a helpful assistant that prioritizes clear, concise answers. Always ask clarifying questions before taking irreversible actions."
                  className={`${inputClass} resize-none`}
                />
              </SheetField>
              <div className="flex flex-wrap gap-3 pt-1">
                <Button
                  type="button"
                  onClick={() => savePersonality.mutate()}
                  disabled={savePersonality.isPending || !agent}
                  isLoading={savePersonality.isPending}
                >
                  <Save size={14} />
                  {savePersonality.isPending ? 'Saving…' : 'Save note'}
                </Button>
                <a href={`/lenser/${handle}/ag/personality`} className={secondaryBtn}>
                  Full personality settings
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
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => exportBundle.mutate()}
                  disabled={exportBundle.isPending || !agent}
                  isLoading={exportBundle.isPending}
                >
                  <Download size={14} />
                  {exportBundle.isPending ? 'Exporting…' : 'Export workspace'}
                </Button>
              </div>
              <Alert variant="error" title="Danger zone">
                <p className="mt-1 text-xs leading-5">
                  Submits a deletion request. An admin must confirm before data is removed.
                </p>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    const reason = window.prompt('Reason for deletion?') ?? ''
                    if (reason) requestDeletion.mutate(reason)
                  }}
                >
                  <Trash2 size={12} />
                  Request deletion
                </Button>
              </Alert>
            </div>
          )}

          <ScheduleDrawer
            open={schedDrawerOpen}
            onClose={() => setSchedDrawerOpen(false)}
            workflows={workflowsQuery.data ?? []}
            initial={schedEditing}
            ownerLenserId={agent.owner_lenser_id}
            defaultAssigneeId={agent.ai_lenser_id}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: queryKeys.workflows.schedules(null) })
            }}
          />
        </div>
      )}
    </Drawer>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-yellow-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const secondaryBtn =
  'inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-primary-yellow-300 hover:text-primary-yellow-700 dark:border-gray-700 dark:text-gray-200'

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
