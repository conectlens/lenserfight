import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react'
import React, { useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { MemoryProfileDrawer } from '../drawers/MemoryProfileDrawer'
import { EmptyPanel } from '../EmptyPanel'

import { SectionPage } from './SectionPage'

import type { AgentMemoryProfileRecord } from '@lenserfight/types'

export const MemorySection: React.FC = () => {
  const { bootstrap, profile, viewMode } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<AgentMemoryProfileRecord | null>(null)

  const profiles =
    (bootstrap?.profiles.memory as AgentMemoryProfileRecord[] | undefined) ?? []
  const isAgentOwner = viewMode === 'agent_owner'

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.workspaceBootstrap(profile.handle),
    })

  const remove = useMutation({
    mutationFn: (id: string) => agentWorkspaceService.deleteMemoryProfile(id),
    onSuccess: invalidate,
  })

  const openCreate = () => {
    setEditing(null)
    setDrawerOpen(true)
  }
  const openEdit = (p: AgentMemoryProfileRecord) => {
    setEditing(p)
    setDrawerOpen(true)
  }

  return (
    <SectionPage
      eyebrow="Memory"
      title="Memory profiles"
      description="Control whether runs share context, how long memory survives, and who can see it. Profiles can be scoped to a team, a single agent, or a workflow."
      toolbar={
        isAgentOwner && bootstrap ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
          >
            <Plus size={16} />
            New memory profile
          </button>
        ) : undefined
      }
    >
      {profiles.length === 0 ? (
        <EmptyPanel
          icon={<ClipboardList size={20} />}
          title="No memory profiles yet"
          description="Define short-term, long-term, or shared team memory before enabling collaborative runs."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map((p) => (
            <MemoryProfileCard
              key={p.id}
              record={p}
              canManage={isAgentOwner}
              onEdit={() => openEdit(p)}
              onDelete={() => {
                if (confirm(`Delete memory profile "${p.name}"?`)) {
                  remove.mutate(p.id)
                }
              }}
            />
          ))}
        </div>
      )}

      {isAgentOwner && bootstrap && (
        <MemoryProfileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          aiLenserId={bootstrap.ai_lenser_id}
          initial={editing}
          onSaved={invalidate}
        />
      )}
    </SectionPage>
  )
}

const MemoryProfileCard: React.FC<{
  record: AgentMemoryProfileRecord
  canManage: boolean
  onEdit: () => void
  onDelete: () => void
}> = ({ record, canManage, onEdit, onDelete }) => (
  <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {record.name}
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {record.scope_type} · {record.isolation_mode} · retain{' '}
          {record.retention_days}d · {record.visibility}
        </p>
      </div>
      {canManage && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:text-amber-600 dark:border-gray-700 dark:text-gray-400"
            aria-label="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:text-red-600 dark:border-gray-700 dark:text-gray-400"
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
      Strategy: {record.summary_strategy} · reset {record.reset_policy}
    </p>
  </div>
)
