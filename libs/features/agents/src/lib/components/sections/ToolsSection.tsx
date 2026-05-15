import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService, toolsService } from '@lenserfight/data/repositories'
import { useLenserWorkspace } from '@lenserfight/features/profile'
import { Button, Card } from '@lenserfight/ui/components'
import { AlertDialog } from '@lenserfight/ui/overlays'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ClipboardList,
  Pencil,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { AssignToolDrawer } from '../drawers/AssignToolDrawer'
import { RegisterToolDrawer } from '../drawers/RegisterToolDrawer'
import { ToolProfileDrawer } from '../drawers/ToolProfileDrawer'
import { EmptyPanel } from '../EmptyPanel'
import {
  TOOL_TEMPLATE_PRESETS,
  type ToolTemplatePreset,
} from '../toolTemplates'

import { SectionPage } from './SectionPage'
import { ToolApprovalQueueTab } from './ToolApprovalQueueTab'
import { ToolInvocationsTab } from './ToolInvocationsTab'

import type {
  AgentToolProfileRecord,
  ToolAssignmentRecord,
  ToolInvocationRecord,
  ToolRegistryRecord,
} from '@lenserfight/types'

type Tab =
  | 'templates'
  | 'registry'
  | 'profiles'
  | 'assignments'
  | 'invocations'
  | 'approvals'

export const ToolsSection: React.FC = () => {
  const { bootstrap, profile, isOwner, agentProfile } = useAgentWorkspace()
  const { humanWorkspace } = useLenserWorkspace()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('templates')

  const [profileDrawer, setProfileDrawer] = useState(false)
  const [profileEditing, setProfileEditing] =
    useState<AgentToolProfileRecord | null>(null)
  const [registerDrawer, setRegisterDrawer] = useState(false)
  const [registerEditing, setRegisterEditing] =
    useState<ToolRegistryRecord | null>(null)
  const [registerPreset, setRegisterPreset] =
    useState<ToolTemplatePreset | null>(null)
  const [assignDrawer, setAssignDrawer] = useState(false)
  const [selectedRegistryToolId, setSelectedRegistryToolId] = useState<string | null>(null)
  const [confirmState, setConfirmState] = useState<{
    title: string
    body: string
    onConfirm: () => void
  } | null>(null)

  const activeAiLenserId = bootstrap?.ai_lenser_id ?? agentProfile?.ai_lenser_id ?? ''
  const registryOwnerId =
    humanWorkspace?.id ?? agentProfile?.owner_lenser_id ?? profile.id
  const profiles =
    (bootstrap?.profiles.tools as AgentToolProfileRecord[] | undefined) ?? []

  const registryQuery = useQuery<ToolRegistryRecord[]>({
    queryKey: queryKeys.agents.toolRegistry(registryOwnerId),
    queryFn: () => agentWorkspaceService.listToolRegistry(registryOwnerId),
    enabled: isOwner,
    staleTime: 30_000,
  })

  const assignmentsQuery = useQuery<ToolAssignmentRecord[]>({
    queryKey: queryKeys.agents.toolAssignments(activeAiLenserId),
    queryFn: () =>
      agentWorkspaceService.listToolAssignments(activeAiLenserId),
    enabled: isOwner && !!activeAiLenserId,
    staleTime: 30_000,
  })

  const invalidateBootstrap = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.workspaceBootstrap(profile.handle),
    })
  const invalidateRegistry = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.toolRegistry(registryOwnerId),
    })
  const invalidateAssignments = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.toolAssignments(activeAiLenserId),
    })

  const removeProfile = useMutation({
    mutationFn: (id: string) => agentWorkspaceService.deleteToolProfile(id),
    onSuccess: () => {
      toast.success('Tool policy deleted')
      invalidateBootstrap()
    },
    onError: (cause) => toast.error((cause as Error).message),
  })
  const revoke = useMutation({
    mutationFn: (toolId: string) =>
      agentWorkspaceService.revokeTool(activeAiLenserId, toolId),
    onSuccess: () => {
      toast.success('Tool assignment revoked')
      invalidateAssignments()
    },
    onError: (cause) => toast.error((cause as Error).message),
  })

  const approvalQueueQuery = useQuery<ToolInvocationRecord[]>({
    queryKey: queryKeys.agents.toolApprovalQueue(activeAiLenserId),
    queryFn: () => toolsService.listPendingApprovals(activeAiLenserId),
    enabled: isOwner && !!activeAiLenserId,
    staleTime: 10_000,
  })
  const pendingApprovalCount = approvalQueueQuery.data?.length ?? 0

  const tabs: Array<{ id: Tab; label: string; badge?: number }> = [
    { id: 'templates', label: 'Templates' },
    { id: 'registry', label: 'Registered tools' },
    { id: 'profiles', label: 'Policies' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'invocations', label: 'Invocations' },
    { id: 'approvals', label: 'Approvals', badge: pendingApprovalCount || undefined },
  ]

  const registry = registryQuery.data ?? []
  const assignments = assignmentsQuery.data ?? []

  const registryIndex = useMemo(
    () => new Map(registry.map((tool) => [tool.id, tool])),
    [registry]
  )

  const openRegisterDrawer = (preset: ToolTemplatePreset | null = null) => {
    setRegisterEditing(null)
    setRegisterPreset(preset)
    setRegisterDrawer(true)
  }

  const handleToolSaved = (record: ToolRegistryRecord) => {
    queryClient.setQueryData<ToolRegistryRecord[]>(
      queryKeys.agents.toolRegistry(registryOwnerId),
      (current = []) => {
        const others = current.filter((tool) => tool.id !== record.id)
        return [record, ...others]
      }
    )
    setSelectedRegistryToolId(record.id)
    setTab('registry')
    setTimeout(invalidateRegistry, 2000)
  }

  const toolbar = (() => {
    if (!isOwner) return undefined

    if (tab === 'templates') {
      return (
        <Button
          type="button"
          onClick={() => openRegisterDrawer(null)}
        >
          <Plus size={16} />
          Register from scratch
        </Button>
      )
    }

    if (tab === 'registry') {
      return (
        <Button
          type="button"
          onClick={() => openRegisterDrawer(null)}
        >
          <Plus size={16} />
          Register tool
        </Button>
      )
    }

    if (tab === 'profiles') {
      return (
        <Button
          type="button"
          onClick={() => {
            setProfileEditing(null)
            setProfileDrawer(true)
          }}
        >
          <Plus size={16} />
          New policy
        </Button>
      )
    }

    return (
      <Button
        type="button"
        onClick={() => setAssignDrawer(true)}
        disabled={registry.length === 0}
      >
        <Plus size={16} />
        Assign tool
      </Button>
    )
  })()

  return (
    <SectionPage
      eyebrow="Tools"
      docsPath="/how-to/agents/workspace/tools"
      docsTip="Tool registry, assignments, invocation log. Tools are sandboxed per egress class (none/read/network/mutation); higher classes require approval."
      title="Templates, policies, and assignments"
      description="Start from a typed tool template, register concrete integrations, define reusable tool policies, and assign approved capabilities to the selected AI lenser."
      toolbar={toolbar}
    >
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2 dark:border-gray-800">
        {tabs.map((tabItem) => (
          <Button
            key={tabItem.id}
            type="button"
            onClick={() => setTab(tabItem.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === tabItem.id
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
          </Button>
        ))}
      </div>

      {tab === 'templates' && (
        <div className="grid gap-4 md:grid-cols-2">
          {TOOL_TEMPLATE_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {preset.label}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                    {preset.summary}
                  </p>
                </div>
                <Sparkles size={18} className="text-primary-yellow-500" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                {preset.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-gray-200 px-2 py-0.5 font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
                <span className="rounded-full border border-primary-yellow-200 px-2 py-0.5 font-semibold text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300">
                  {preset.auth_method}
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="dark"
                  onClick={() => openRegisterDrawer(preset)}
                >
                  Use template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTab('registry')}
                >
                  See registry
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'registry' &&
        (registryQuery.isLoading ? (
          <CenteredLoading label="Loading registered tools..." />
        ) : registry.length === 0 ? (
          <EmptyPanel
            icon={<ClipboardList size={20} />}
            title="No registered tools yet"
            description="Start with a template or register a custom integration. The registry stores the concrete tool schema, auth mode, and approval flags that assignments will use."
          >
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                type="button"
                variant="dark"
                onClick={() => setTab('templates')}
              >
                Browse templates
              </Button>
              <Button
                type="button"
                onClick={() => openRegisterDrawer(null)}
                className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-primary-yellow-300 hover:text-primary-yellow-700 dark:border-gray-700 dark:text-gray-200"
              >
                Register custom tool
              </Button>
            </div>
          </EmptyPanel>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {registry.map((tool) => (
              <div
                key={tool.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition dark:bg-gray-900 ${
                  selectedRegistryToolId === tool.id
                    ? 'border-primary-yellow-300 ring-2 ring-primary-yellow-200 dark:border-primary-yellow-500/40 dark:ring-primary-yellow-500/20'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {tool.name}
                    </h3>
                    <p className="mt-1 text-xs font-mono text-gray-500 dark:text-gray-400">
                      {tool.key} · {tool.category} · auth: {tool.auth_method}
                    </p>
                    {tool.description && (
                      <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                        {tool.description}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setRegisterPreset(null)
                      setRegisterEditing(tool)
                      setRegisterDrawer(true)
                    }}
                    className={iconBtn}
                    aria-label="Edit tool"
                  >
                    <Pencil size={14} />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  {tool.requires_approval && (
                    <span className="rounded-full border border-primary-yellow-200 px-2 py-0.5 font-semibold text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300">
                      Approval
                    </span>
                  )}
                  {tool.is_dangerous && (
                    <span className="rounded-full border border-red-200 px-2 py-0.5 font-semibold text-red-700 dark:border-red-500/30 dark:text-red-300">
                      Dangerous
                    </span>
                  )}
                  <span className="rounded-full border border-gray-200 px-2 py-0.5 font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                    {tool.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}

      {tab === 'profiles' &&
        (profiles.length === 0 ? (
          <EmptyPanel
            icon={<ShieldAlert size={20} />}
            title="No tool policies yet"
            description="Policies define which tool groups are allowed, denied, or approval-gated for the selected AI lenser. Create one before relying on prompt-only instructions."
          >
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="dark"
                onClick={() => {
                  setProfileEditing(null)
                  setProfileDrawer(true)
                }}
              >
                Create policy
              </Button>
            </div>
          </EmptyPanel>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {profiles.map((profileRecord) => (
              <div
                key={profileRecord.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {profileRecord.name}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Groups: {(profileRecord.tool_groups ?? []).join(', ') || 'None'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Allow: {(profileRecord.allow_tools ?? []).length} · Deny:{' '}
                      {(profileRecord.deny_tools ?? []).length}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setProfileEditing(profileRecord)
                        setProfileDrawer(true)
                      }}
                      className={iconBtn}
                      aria-label="Edit policy"
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      type="button"
                      onClick={() =>
                        setConfirmState({
                          title: 'Delete tool policy?',
                          body: `Delete "${profileRecord.name}"? This cannot be undone.`,
                          onConfirm: () => removeProfile.mutate(profileRecord.id),
                        })
                      }
                      className={iconBtn}
                      aria-label="Delete policy"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                {profileRecord.requires_approval && (
                  <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary-yellow-200 px-2.5 py-1 text-[11px] font-semibold text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300">
                    <ShieldAlert size={12} /> Requires approval
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}

      {tab === 'assignments' &&
        (assignmentsQuery.isLoading ? (
          <CenteredLoading label="Loading tool assignments..." />
        ) : assignments.length === 0 ? (
          <EmptyPanel
            icon={<ClipboardList size={20} />}
            title="No tool assignments yet"
            description="Register a tool first, then assign it to the selected AI lenser so new runs can access it safely."
          >
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                type="button"
                variant="dark"
                onClick={() => setTab(registry.length === 0 ? 'templates' : 'registry')}
              >
                {registry.length === 0 ? 'Start with templates' : 'Manage registry'}
              </Button>
              {registry.length > 0 && (
                <Button
                  type="button"
                  onClick={() => setAssignDrawer(true)}
                  className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-primary-yellow-300 hover:text-primary-yellow-700 dark:border-gray-700 dark:text-gray-200"
                >
                  Assign tool
                </Button>
              )}
            </div>
          </EmptyPanel>
        ) : (
          <div className="grid gap-3">
            {assignments.map((assignment) => {
              const tool = registryIndex.get(assignment.tool_id)
              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {tool?.name ?? assignment.tool_id}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {assignment.allowed ? 'allowed' : 'blocked'} · since{' '}
                      {new Date(assignment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() =>
                      setConfirmState({
                        title: 'Revoke tool assignment?',
                        body: 'Revoke access to this tool? New runs will no longer have it available.',
                        onConfirm: () => revoke.mutate(assignment.tool_id),
                      })
                    }
                    className={iconBtn}
                    aria-label="Revoke tool"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )
            })}
          </div>
        ))}

      {tab === 'invocations' && activeAiLenserId && (
        <ToolInvocationsTab aiLenserId={activeAiLenserId} isOwner={isOwner} />
      )}

      {tab === 'approvals' && activeAiLenserId && (
        <ToolApprovalQueueTab aiLenserId={activeAiLenserId} isOwner={isOwner} />
      )}

      {isOwner && (
        <RegisterToolDrawer
          open={registerDrawer}
          onClose={() => setRegisterDrawer(false)}
          initial={registerEditing}
          preset={registerPreset}
          onSaved={handleToolSaved}
        />
      )}
      {isOwner && !!activeAiLenserId && (
        <>
          <ToolProfileDrawer
            open={profileDrawer}
            onClose={() => setProfileDrawer(false)}
            aiLenserId={activeAiLenserId}
            initial={profileEditing}
            onSaved={invalidateBootstrap}
          />
          <AssignToolDrawer
            open={assignDrawer}
            onClose={() => setAssignDrawer(false)}
            aiLenserId={activeAiLenserId}
            registry={registry}
            preferredToolId={selectedRegistryToolId}
            onAssigned={invalidateAssignments}
          />
        </>
      )}

      <AlertDialog
        open={!!confirmState}
        onClose={() => setConfirmState(null)}
        title={confirmState?.title ?? ''}
        bodyText={confirmState?.body}
        variant="destructive"
        confirmAction={{
          label: 'Delete',
          onClick: () => {
            confirmState?.onConfirm()
            setConfirmState(null)
          },
          loading: removeProfile.isPending || revoke.isPending,
        }}
      />
    </SectionPage>
  )
}

const iconBtn =
  'rounded-2xl border border-gray-200 p-2 text-gray-500 transition hover:border-primary-yellow-300 hover:text-primary-yellow-700 dark:border-gray-700 dark:text-gray-300'

const CenteredLoading: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-gray-200 bg-white text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
    {label}
  </div>
)
