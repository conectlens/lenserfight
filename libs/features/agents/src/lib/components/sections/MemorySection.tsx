import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { AlertDialog } from '@lenserfight/ui/overlays'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Brain, Clock, Layers, Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { MemoryProfileDrawer } from '../drawers/MemoryProfileDrawer'
import { EmptyPanel } from '../EmptyPanel'

import { SectionPage } from './SectionPage'

import type { AgentMemoryProfileRecord } from '@lenserfight/types'

export const MemorySection: React.FC = () => {
  const { bootstrap, profile, isOwner } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<AgentMemoryProfileRecord | null>(null)
  const [confirmState, setConfirmState] = useState<{
    title: string
    body: string
    onConfirm: () => void
  } | null>(null)

  const profiles =
    (bootstrap?.profiles.memory as AgentMemoryProfileRecord[] | undefined) ?? []

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.workspaceBootstrap(profile.handle),
    })

  const remove = useMutation({
    mutationFn: (id: string) => agentWorkspaceService.deleteMemoryProfile(id),
    onSuccess: () => { toast.success('Memory profile deleted'); invalidate() },
    onError: (e) => toast.error((e as Error).message),
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
        isOwner && bootstrap ? (
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
          icon={<Brain size={20} />}
          title="No memory profiles yet"
          description="Define short-term, long-term, or shared team memory before enabling collaborative runs."
        >
          {isOwner && bootstrap ? (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={openCreate}
                className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
              >
                Create memory profile
              </button>
            </div>
          ) : undefined}
        </EmptyPanel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map((p) => (
            <MemoryProfileCard
              key={p.id}
              record={p}
              canManage={isOwner}
              onEdit={() => openEdit(p)}
              onDelete={() =>
                setConfirmState({
                  title: 'Delete memory profile?',
                  body: `Delete "${p.name}"? This cannot be undone.`,
                  onConfirm: () => remove.mutate(p.id),
                })
              }
            />
          ))}
        </div>
      )}

      {isOwner && bootstrap && (
        <MemoryProfileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          aiLenserId={bootstrap.ai_lenser_id}
          initial={editing}
          onSaved={invalidate}
        />
      )}

      <AlertDialog
        open={!!confirmState}
        onClose={() => setConfirmState(null)}
        title={confirmState?.title ?? ''}
        bodyText={confirmState?.body}
        variant="destructive"
        confirmAction={{
          label: 'Delete',
          onClick: () => { confirmState?.onConfirm(); setConfirmState(null) },
          loading: remove.isPending,
        }}
      />
    </SectionPage>
  )
}

const SCOPE_COLORS: Record<string, string> = {
  team: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
  agent: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
  workflow: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20',
  global: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
}

const ISOLATION_COLORS: Record<string, string> = {
  shared: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  isolated: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20',
  sandboxed: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20',
}

function Badge({ value, colorMap }: { value: string; colorMap: Record<string, string> }) {
  const cls = colorMap[value] ?? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {value}
    </span>
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
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        {record.name}
      </h3>
      {canManage && (
        <div className="flex flex-shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-gray-200 p-1.5 text-gray-500 transition hover:text-amber-600 dark:border-gray-700 dark:text-gray-400"
            aria-label="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl border border-gray-200 p-1.5 text-gray-500 transition hover:text-red-600 dark:border-gray-700 dark:text-gray-400"
            aria-label="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>

    <div className="mt-3 flex flex-wrap gap-1.5">
      <Badge value={record.scope_type} colorMap={SCOPE_COLORS} />
      <Badge value={record.isolation_mode} colorMap={ISOLATION_COLORS} />
      <Badge value={record.visibility} colorMap={ISOLATION_COLORS} />
    </div>

    <div className="mt-4 grid grid-cols-3 gap-3">
      <MetaItem icon={<Clock size={12} />} label="Retain" value={`${record.retention_days}d`} />
      <MetaItem icon={<RefreshCcw size={12} />} label="Reset" value={record.reset_policy} />
      <MetaItem icon={<Layers size={12} />} label="Summary" value={record.summary_strategy.replace('_', ' ')} />
    </div>
  </div>
)

const MetaItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="rounded-[16px] border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-950">
    <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
      {icon}
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span>
    </div>
    <p className="mt-1 truncate text-xs font-semibold text-gray-700 dark:text-gray-200">{value}</p>
  </div>
)
