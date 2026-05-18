import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService, lenserService } from '@lenserfight/data/repositories'
import type { AgentPermissionScope, AgentOwnershipDelegateRecord, ApprovalRequestView } from '@lenserfight/types'
import { Alert, Button, Card } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, ShieldCheck, ShieldPlus, Users, History, CheckCircle, XCircle, Edit3 } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { BootstrapStatusPanel } from '../BootstrapStatusPanel'
import { EmptyPanel } from '../EmptyPanel'

import { ApprovalQueueSection } from './ApprovalQueueSection'
import { ProfileCard } from './_shared'
import { SectionPage } from './SectionPage'

const OWNERSHIP_QUERY_KEY = (aiLenserId: string) =>
  [...queryKeys.agents.all, 'ownerships', aiLenserId] as const

const APPROVAL_HISTORY_QUERY_KEY = (aiLenserId: string) =>
  [...queryKeys.agents.all, 'approval-history', aiLenserId] as const

const PERMISSION_SCOPE_OPTIONS: Array<{
  scope: AgentPermissionScope
  label: string
  description: string
}> = [
    {
      scope: 'approvals:decide',
      label: 'Approvals',
      description: 'Approve, reject, or modify blocked autonomous runs.',
    },
    {
      scope: 'team:manage',
      label: 'Team builder',
      description: 'Create crews, edit members, and manage handoff topology.',
    },
    {
      scope: 'workflow:assign',
      label: 'Workflow assignments',
      description: 'Attach reusable workflows to the agent or a team.',
    },
    {
      scope: 'schedule:manage',
      label: 'Schedules',
      description: 'Create and pause CRON dispatch for agent and team runs.',
    },
    {
      scope: 'memory:manage',
      label: 'Memory',
      description: 'Create memory profiles and write or redact entries.',
    },
    {
      scope: 'tools:manage',
      label: 'Tools',
      description: 'Register tools, edit policies, and manage assignments.',
    },
    {
      scope: 'models:manage',
      label: 'Models',
      description: 'Manage provider bindings, model profiles, and defaults.',
    },
    {
      scope: 'settings:manage',
      label: 'Settings',
      description: 'Edit agent settings, provider config, and control-room defaults.',
    },
    {
      scope: 'logs:view',
      label: 'Logs',
      description: 'Read run reports, incidents, and audit trails.',
    },
  ]

type LenserSearchResult = {
  id: string
  handle: string
  display_name: string
  avatar_url: string | null
}


type ApprovalsTab = 'queue' | 'delegates' | 'audit'

export const ApprovalsSection: React.FC = () => {
  const { bootstrap, bootstrapState, agentProfile, profile, isOwner } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<ApprovalsTab>('queue')
  const [delegateQuery, setDelegateQuery] = useState('')
  const [selectedDelegateId, setSelectedDelegateId] = useState('')
  const [selectedDelegateLabel, setSelectedDelegateLabel] = useState('')
  const [selectedRole, setSelectedRole] = useState<'co_owner' | 'operator'>('operator')
  const [selectedScopes, setSelectedScopes] = useState<AgentPermissionScope[]>([
    'approvals:decide',
    'logs:view',
  ])

  const aiLenserId = bootstrap?.ai_lenser_id ?? agentProfile?.ai_lenser_id ?? ''
  const activeToolPolicies =
    bootstrap?.profiles.tools.filter((toolProfile) => toolProfile.requires_approval).length ?? 0
  const gatedWorkflowAssignments =
    bootstrap?.workflow_assignments.filter((assignment) => {
      const mode = (assignment.approval_policy as { mode?: string } | null)?.mode
      return !!mode && mode !== 'none'
    }).length ?? 0

  const pendingApprovalsQuery = useQuery({
    queryKey: queryKeys.agents.approvals(aiLenserId, 'pending'),
    queryFn: () =>
      agentWorkspaceService.listApprovalRequests(aiLenserId, {
        status: 'pending',
        limit: 20,
      }),
    enabled: isOwner && !!aiLenserId,
    staleTime: 10_000,
  })

  const approvalHistoryQuery = useQuery<ApprovalRequestView[]>({
    queryKey: APPROVAL_HISTORY_QUERY_KEY(aiLenserId),
    queryFn: () =>
      agentWorkspaceService.listApprovalRequests(aiLenserId, {
        limit: 50,
      }),
    enabled: isOwner && !!aiLenserId && tab === 'audit',
    staleTime: 30_000,
  })

  const ownershipsQuery = useQuery<AgentOwnershipDelegateRecord[]>({
    queryKey: OWNERSHIP_QUERY_KEY(aiLenserId),
    queryFn: () => agentWorkspaceService.listAgentOwnerships(aiLenserId),
    enabled: isOwner && !!aiLenserId,
    staleTime: 15_000,
  })

  const delegateSearchQuery = useQuery<LenserSearchResult[]>({
    queryKey: [...queryKeys.lenser.all, 'search', delegateQuery.trim(), 'delegates'],
    queryFn: () => lenserService.searchLensers(delegateQuery.trim(), 6),
    enabled: isOwner && delegateQuery.trim().length >= 2,
    staleTime: 15_000,
  })

  const invalidateOwnerships = async () => {
    await queryClient.invalidateQueries({
      queryKey: OWNERSHIP_QUERY_KEY(aiLenserId),
    })
  }

  const upsertDelegate = useMutation({
    mutationFn: () =>
      agentWorkspaceService.upsertAgentOwnership({
        ai_lenser_id: aiLenserId,
        owner_lenser_id: selectedDelegateId,
        role: selectedRole,
        permission_scope:
          selectedRole === 'operator'
            ? selectedScopes
            : PERMISSION_SCOPE_OPTIONS.map((item) => item.scope),
      }),
    onSuccess: async () => {
      toast.success('Delegate permissions updated')
      await invalidateOwnerships()
      resetDelegateDraft()
    },
    onError: (cause) => toast.error((cause as Error).message),
  })

  const revokeDelegate = useMutation({
    mutationFn: (ownershipId: string) => agentWorkspaceService.revokeAgentOwnership(ownershipId),
    onSuccess: async () => {
      toast.success('Delegate revoked')
      await invalidateOwnerships()
    },
    onError: (cause) => toast.error((cause as Error).message),
  })

  function resetDelegateDraft() {
    setDelegateQuery('')
    setSelectedDelegateId('')
    setSelectedDelegateLabel('')
    setSelectedRole('operator')
    setSelectedScopes(['approvals:decide', 'logs:view'])
  }

  const ownerRecords = ownershipsQuery.data ?? []
  const pendingCount = pendingApprovalsQuery.data?.length ?? 0
  const delegateCount = ownerRecords.filter((record) => record.role !== 'owner').length

  const myOwnerRecord = useMemo(
    () => ownerRecords.find((r) => r.owner_lenser_id === profile.id),
    [ownerRecords, profile.id]
  )
  const myScopes: AgentPermissionScope[] =
    myOwnerRecord?.role === 'co_owner'
      ? PERMISSION_SCOPE_OPTIONS.map((o) => o.scope)
      : (myOwnerRecord?.permission_scope ?? [])

  const isOwnerOrCoOwner =
    isOwner && (!myOwnerRecord || myOwnerRecord.role === 'owner' || myOwnerRecord.role === 'co_owner')

  const searchResults = useMemo(
    () =>
      (delegateSearchQuery.data ?? []).filter(
        (result) => result.id !== profile.id || result.id === selectedDelegateId
      ),
    [delegateSearchQuery.data, profile.id, selectedDelegateId]
  )

  const handleScopeToggle = (scope: AgentPermissionScope) => {
    setSelectedScopes((current) =>
      current.includes(scope)
        ? current.filter((item) => item !== scope)
        : [...current, scope]
    )
  }

  const startEditingDelegate = (record: AgentOwnershipDelegateRecord) => {
    setSelectedDelegateId(record.owner_lenser_id)
    setSelectedDelegateLabel(
      record.owner_display_name || record.owner_handle || record.owner_lenser_id
    )
    setDelegateQuery(record.owner_handle ?? '')
    if (record.role === 'co_owner') {
      setSelectedRole('co_owner')
      setSelectedScopes(PERMISSION_SCOPE_OPTIONS.map((item) => item.scope))
    } else {
      setSelectedRole('operator')
      setSelectedScopes(record.permission_scope ?? [])
    }
    setTab('delegates')
  }

  if (!bootstrap && !aiLenserId) {
    return (
      <SectionPage
        eyebrow="Permissions"
        docsPath="/how-to/agents/workspace/approvals"
        docsTip="Pending approval gates for tool calls, autonomous battle entries, and elevated-egress workflows. Approve, Deny, or Defer per row."
        title="Human approval gates"
        description="Human Lensers govern when an AI Lenser may act autonomously and who else can operate the control room."
      >
        {bootstrapState.kind === 'idle' ? (
          <EmptyPanel
            icon={<ClipboardCheck size={20} />}
            title="No agent selected"
            description="Open an AI lenser workspace to manage approvals, delegates, and runtime permissions."
          />
        ) : (
          <BootstrapStatusPanel state={bootstrapState} />
        )}
      </SectionPage>
    )
  }

  const tabs: Array<{ id: ApprovalsTab; label: string; badge?: number }> = [
    { id: 'queue', label: 'Pending queue', badge: pendingCount || undefined },
    { id: 'delegates', label: 'Delegates' },
    { id: 'audit', label: 'Audit history' },
  ]

  return (
    <SectionPage
      eyebrow="Permissions"
      docsPath="/how-to/agents/workspace/approvals"
      docsTip="Pending queue, delegates, and audit history. Delegates inherit scoped permissions; every approval decision is audited."
      title="Human approval gates"
      description="Permissions define who can operate this AI Lenser, which autonomous actions still require a human checkpoint, and how delegates are scoped across the control room."
    >
      {/* My scopes banner — shown when current user is a scoped operator */}
      {!isOwnerOrCoOwner && myOwnerRecord && myScopes.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
            Your operator access
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {myScopes.map((scope) => (
              <span
                key={scope}
                className="rounded-full border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-500/30 dark:text-blue-300"
              >
                {scope}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          icon={<ClipboardCheck size={16} />}
          label="Pending approvals"
          value={String(pendingCount)}
          caption="Blocked runs awaiting a human decision."
        />
        <SummaryCard
          icon={<ShieldCheck size={16} />}
          label="Approval-gated tools"
          value={String(activeToolPolicies)}
          caption="Tool policies that still require human approval."
        />
        <SummaryCard
          icon={<ShieldPlus size={16} />}
          label="Scoped workflow gates"
          value={String(gatedWorkflowAssignments)}
          caption="Assignments with custom approval rules."
        />
        <SummaryCard
          icon={<Users size={16} />}
          label="Human delegates"
          value={String(delegateCount)}
          caption="Co-owners and operators besides the primary owner."
        />
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-0 dark:border-gray-800">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => setTab(tabItem.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tab === tabItem.id
              ? 'border-primary-yellow-500 text-primary-yellow-700 dark:text-primary-yellow-300'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
          >
            {tabItem.label}
            {tabItem.badge ? (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {tabItem.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Pending queue tab */}
      {tab === 'queue' && (
        <ProfileCard
          title="Pending approvals"
          subtitle="Blocked autonomous runs pause here until a human decides whether to proceed."
        >
          {aiLenserId ? (
            <ApprovalQueueSection aiLenserId={aiLenserId} />
          ) : (
            <BootstrapStatusPanel state={bootstrapState} />
          )}
        </ProfileCard>
      )}

      {/* Delegates tab */}
      {tab === 'delegates' && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <ProfileCard
            title="Human delegates"
            subtitle="Owner and co-owner roles have full control. Operators must be explicitly scoped."
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-600 dark:border-gray-800 dark:bg-gray-700 dark:text-gray-300">
                Think of this like an Instagram account: one primary owner, optional co-owners for
                full administration, and operators for scoped tasks only (e.g., approve runs, view
                logs, assign workflows).
              </div>

              {isOwner && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                      Delegate search
                    </span>
                    <input
                      value={delegateQuery}
                      onChange={(event) => setDelegateQuery(event.target.value)}
                      placeholder="Search a human Lenser by handle or display name"
                      className={inputClass}
                    />
                  </label>

                  {delegateSearchQuery.isFetching ? (
                    <p className="text-xs text-gray-400">Searching Lensers...</p>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-2">
                      {searchResults.map((result) => (
                        <Button
                          key={result.id}
                          type="button"
                          onClick={() => {
                            setSelectedDelegateId(result.id)
                            setSelectedDelegateLabel(
                              result.display_name || `@${result.handle}`
                            )
                            setDelegateQuery(result.handle)
                          }}
                          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${selectedDelegateId === result.id
                            ? 'border-primary-yellow-300 bg-primary-yellow-50 dark:border-primary-yellow-500/30 dark:bg-primary-yellow-500/10'
                            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                            }`}
                        >
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {result.display_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              @{result.handle}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-primary-yellow-700 dark:text-primary-yellow-300">
                            Select
                          </span>
                        </Button>
                      ))}
                    </div>
                  ) : delegateQuery.trim().length >= 2 ? (
                    <p className="text-xs text-gray-400">No Lensers matched that query.</p>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-2">
                    <SelectField
                      label="Role"
                      value={selectedRole}
                      onChange={(value) =>
                        setSelectedRole(value as 'co_owner' | 'operator')
                      }
                      options={[
                        { value: 'operator', label: 'operator' },
                        { value: 'co_owner', label: 'co_owner' },
                      ]}
                    />
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {selectedDelegateId
                        ? `Selected: ${selectedDelegateLabel}`
                        : 'Select a human Lenser to grant access.'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                      Capability scope
                    </p>
                    {selectedRole === 'co_owner' ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                        Co-owners inherit the full control-room surface except ownership transfer and destructive deletion.
                      </div>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-2">
                        {PERMISSION_SCOPE_OPTIONS.map((item) => (
                          <label
                            key={item.scope}
                            className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                          >
                            <input
                              type="checkbox"
                              checked={selectedScopes.includes(item.scope)}
                              onChange={() => handleScopeToggle(item.scope)}
                              className="mt-1"
                            />
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {item.label}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {item.description}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetDelegateDraft}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => upsertDelegate.mutate()}
                      disabled={
                        upsertDelegate.isPending ||
                        !selectedDelegateId ||
                        (selectedRole === 'operator' && selectedScopes.length === 0)
                      }
                    >
                      {upsertDelegate.isPending ? 'Saving...' : 'Grant access'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {ownerRecords.length === 0 ? (
                  <EmptyPanel
                    icon={<Users size={18} />}
                    title="No delegates found"
                    description="The primary owner is still the only human with control-room access."
                  />
                ) : (
                  ownerRecords.map((record) => (
                    <div
                      key={record.id}
                      className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {record.owner_display_name || record.owner_handle || record.owner_lenser_id}
                            </p>
                            <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-semibold uppercase text-gray-600 dark:border-gray-700 dark:text-gray-300">
                              {record.role}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            @{record.owner_handle ?? 'unknown'} · granted{' '}
                            {new Date(record.granted_at).toLocaleDateString()}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(record.role === 'co_owner'
                              ? PERMISSION_SCOPE_OPTIONS.map((item) => item.scope)
                              : record.permission_scope
                            ).map((scope) => (
                              <span
                                key={scope}
                                className="rounded-full border border-primary-yellow-200 px-2 py-0.5 text-[11px] font-semibold text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300"
                              >
                                {scope}
                              </span>
                            ))}
                          </div>
                        </div>

                        {isOwner && record.role !== 'owner' && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingDelegate(record)}
                            >
                              <Edit3 size={12} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => revokeDelegate.mutate(record.id)}
                              disabled={revokeDelegate.isPending}
                            >
                              Revoke
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </ProfileCard>

          <ProfileCard
            title="Capability matrix"
            subtitle="Operators only get what you explicitly grant. Co-owners bypass scope checks."
          >
            <div className="space-y-3">
              {PERMISSION_SCOPE_OPTIONS.map((item) => (
                <div
                  key={item.scope}
                  className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {item.label}
                    </p>
                    <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                      {item.scope}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </ProfileCard>
        </div>
      )}

      {/* Audit history tab */}
      {tab === 'audit' && (
        <ProfileCard
          title="Approval history"
          subtitle="All approval decisions for this AI lenser, newest first."
        >
          {approvalHistoryQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-700"
                />
              ))}
            </div>
          ) : !approvalHistoryQuery.data || approvalHistoryQuery.data.length === 0 ? (
            <EmptyPanel
              icon={<History size={18} />}
              title="No approval history yet"
              description="Approval decisions will appear here once blocked runs have been decided."
            />
          ) : (
            <div className="space-y-3">
              {approvalHistoryQuery.data.map((item) => (
                <div
                  key={item.request_id}
                  className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {item.approval_status === 'approved' ? (
                      <CheckCircle size={16} className="text-emerald-500" />
                    ) : item.approval_status === 'rejected' ? (
                      <XCircle size={16} className="text-red-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-primary-yellow-400 bg-primary-yellow-50 dark:bg-primary-yellow-900/20" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.approval_status === 'approved'
                          ? 'border border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300'
                          : item.approval_status === 'rejected'
                            ? 'border border-red-200 text-red-700 dark:border-red-500/30 dark:text-red-300'
                            : 'border border-primary-yellow-200 text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300'
                          }`}
                      >
                        {item.approval_status}
                      </span>
                      {item.workflow_title && (
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.workflow_title}
                        </span>
                      )}
                      {item.gate_kind && (
                        <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500 dark:border-gray-700 dark:text-gray-400">
                          {item.gate_kind}
                        </span>
                      )}
                    </div>
                    {item.metadata?.decision_reason && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {item.metadata.decision_reason}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                      {new Date(item.completed_at ?? item.requested_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ProfileCard>
      )}
    </SectionPage>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-yellow-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const SummaryCard: React.FC<{
  icon: React.ReactNode
  label: string
  value: string
  caption: string
}> = ({ icon, label, value, caption }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex rounded-2xl border border-primary-yellow-200 bg-primary-yellow-50 p-2 text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:bg-primary-yellow-500/10 dark:text-primary-yellow-300">
        {icon}
      </span>
      <p className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
      {label}
    </p>
    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{caption}</p>
  </div>
)
