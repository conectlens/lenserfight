import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { AlertDialog } from '@lenserfight/ui/overlays'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ClipboardList,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { AssignToolDrawer } from '../drawers/AssignToolDrawer'
import { RegisterToolDrawer } from '../drawers/RegisterToolDrawer'
import { ToolProfileDrawer } from '../drawers/ToolProfileDrawer'
import { EmptyPanel } from '../EmptyPanel'

import { SectionPage } from './SectionPage'

import type {
  AgentToolProfileRecord,
  ToolAssignmentRecord,
  ToolRegistryRecord,
} from '@lenserfight/types'

type Tab = 'profiles' | 'registry' | 'assignments'

export const ToolsSection: React.FC = () => {
  const { bootstrap, profile, viewMode } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('profiles')

  const [profileDrawer, setProfileDrawer] = useState(false)
  const [profileEditing, setProfileEditing] =
    useState<AgentToolProfileRecord | null>(null)
  const [registerDrawer, setRegisterDrawer] = useState(false)
  const [registerEditing, setRegisterEditing] =
    useState<ToolRegistryRecord | null>(null)
  const [assignDrawer, setAssignDrawer] = useState(false)
  const [confirmState, setConfirmState] = useState<{
    title: string
    body: string
    onConfirm: () => void
  } | null>(null)

  const isAgentOwner = viewMode === 'agent_owner'
  const profiles =
    (bootstrap?.profiles.tools as AgentToolProfileRecord[] | undefined) ?? []

  const registryQuery = useQuery<ToolRegistryRecord[]>({
    queryKey: queryKeys.agents.toolRegistry(profile.id),
    queryFn: () => agentWorkspaceService.listToolRegistry(profile.id),
    enabled: isAgentOwner,
    staleTime: 30_000,
  })

  const assignmentsQuery = useQuery<ToolAssignmentRecord[]>({
    queryKey: queryKeys.agents.toolAssignments(bootstrap?.ai_lenser_id ?? ''),
    queryFn: () =>
      agentWorkspaceService.listToolAssignments(bootstrap!.ai_lenser_id),
    enabled: isAgentOwner && !!bootstrap?.ai_lenser_id,
    staleTime: 30_000,
  })

  const invalidateBootstrap = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.workspaceBootstrap(profile.handle),
    })
  const invalidateRegistry = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.toolRegistry(profile.id),
    })
  const invalidateAssignments = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.toolAssignments(bootstrap?.ai_lenser_id ?? ''),
    })

  const removeProfile = useMutation({
    mutationFn: (id: string) => agentWorkspaceService.deleteToolProfile(id),
    onSuccess: () => { toast.success('Tool profile deleted'); invalidateBootstrap() },
    onError: (e) => toast.error((e as Error).message),
  })
  const revoke = useMutation({
    mutationFn: (toolId: string) =>
      agentWorkspaceService.revokeTool(bootstrap!.ai_lenser_id, toolId),
    onSuccess: () => { toast.success('Tool assignment revoked'); invalidateAssignments() },
    onError: (e) => toast.error((e as Error).message),
  })

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'profiles', label: 'Profiles' },
    { id: 'registry', label: 'Registry' },
    { id: 'assignments', label: 'Assignments' },
  ]

  const toolbar = (() => {
    if (!isAgentOwner || !bootstrap) return undefined
    if (tab === 'profiles') {
      return (
        <button
          type="button"
          onClick={() => {
            setProfileEditing(null)
            setProfileDrawer(true)
          }}
          className={primaryBtn}
        >
          <Plus size={16} />
          New profile
        </button>
      )
    }
    if (tab === 'registry') {
      return (
        <button
          type="button"
          onClick={() => {
            setRegisterEditing(null)
            setRegisterDrawer(true)
          }}
          className={primaryBtn}
        >
          <Plus size={16} />
          Register tool
        </button>
      )
    }
    return (
      <button
        type="button"
        onClick={() => setAssignDrawer(true)}
        className={primaryBtn}
        disabled={(registryQuery.data ?? []).length === 0}
      >
        <Plus size={16} />
        Assign tool
      </button>
    )
  })()

  return (
    <SectionPage
      eyebrow="Tools"
      title="Tool profiles, registry, and assignments"
      description="Profiles control allow/deny lists and approval policy. The registry holds concrete tool definitions. Assignments wire registered tools to this agent."
      toolbar={toolbar}
    >
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.id
                ? 'border-amber-500 text-amber-700 dark:text-amber-300'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profiles' &&
        (profiles.length === 0 ? (
          <EmptyPanel
            icon={<ClipboardList size={20} />}
            title="No tool profiles yet"
            description="Tool profiles should define allow and deny lists instead of relying on prompt instructions alone."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {p.name}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Groups: {(p.tool_groups ?? []).join(', ') || '—'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Allow: {(p.allow_tools ?? []).length} · Deny:{' '}
                      {(p.deny_tools ?? []).length}
                    </p>
                  </div>
                  {isAgentOwner && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileEditing(p)
                          setProfileDrawer(true)
                        }}
                        className={iconBtn}
                        aria-label="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmState({
                            title: 'Delete tool profile?',
                            body: `Delete "${p.name}"? This cannot be undone.`,
                            onConfirm: () => removeProfile.mutate(p.id),
                          })
                        }
                        className={iconBtn}
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                {p.requires_approval && (
                  <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-500/30 dark:text-amber-300">
                    <ShieldAlert size={12} /> Requires approval
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}

      {tab === 'registry' &&
        (registryQuery.isLoading ? (
          <p className="py-10 text-center text-sm text-gray-500">Loading…</p>
        ) : (registryQuery.data ?? []).length === 0 ? (
          <EmptyPanel
            icon={<ClipboardList size={20} />}
            title="No tools registered"
            description="Register external or internal capabilities so agents can invoke them safely. Each tool gets a key, schema, auth method, and approval flag."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(registryQuery.data ?? []).map((tool) => (
              <div
                key={tool.id}
                className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
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
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {tool.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterEditing(tool)
                      setRegisterDrawer(true)
                    }}
                    className={iconBtn}
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  {tool.requires_approval && (
                    <span className="rounded-full border border-amber-200 px-2 py-0.5 font-semibold text-amber-700 dark:border-amber-500/30 dark:text-amber-300">
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

      {tab === 'assignments' &&
        (assignmentsQuery.isLoading ? (
          <p className="py-10 text-center text-sm text-gray-500">Loading…</p>
        ) : (assignmentsQuery.data ?? []).length === 0 ? (
          <EmptyPanel
            icon={<ClipboardList size={20} />}
            title="No tool assignments yet"
            description="Bind registered tools to this agent. Revoke an assignment to immediately remove tool availability for new runs."
          />
        ) : (
          <div className="grid gap-3">
            {(assignmentsQuery.data ?? []).map((assignment) => {
              const tool = (registryQuery.data ?? []).find(
                (t) => t.id === assignment.tool_id
              )
              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between rounded-[20px] border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
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
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmState({
                        title: 'Revoke tool assignment?',
                        body: 'Revoke access to this tool? New runs will no longer have it available.',
                        onConfirm: () => revoke.mutate(assignment.tool_id),
                      })
                    }
                    className={iconBtn}
                    aria-label="Revoke"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        ))}

      {isAgentOwner && bootstrap && (
        <>
          <ToolProfileDrawer
            open={profileDrawer}
            onClose={() => setProfileDrawer(false)}
            aiLenserId={bootstrap.ai_lenser_id}
            initial={profileEditing}
            onSaved={invalidateBootstrap}
          />
          <RegisterToolDrawer
            open={registerDrawer}
            onClose={() => setRegisterDrawer(false)}
            initial={registerEditing}
            onSaved={invalidateRegistry}
          />
          <AssignToolDrawer
            open={assignDrawer}
            onClose={() => setAssignDrawer(false)}
            aiLenserId={bootstrap.ai_lenser_id}
            registry={registryQuery.data ?? []}
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
          label: 'Confirm',
          onClick: () => { confirmState?.onConfirm(); setConfirmState(null) },
          loading: removeProfile.isPending || revoke.isPending,
        }}
      />
    </SectionPage>
  )
}

const primaryBtn =
  'inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900'

const iconBtn =
  'rounded-xl border border-gray-200 p-2 text-gray-500 hover:text-amber-600 dark:border-gray-700 dark:text-gray-400'
