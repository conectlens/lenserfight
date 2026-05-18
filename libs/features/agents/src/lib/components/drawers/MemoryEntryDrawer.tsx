import { queryKeys } from '@lenserfight/data/cache'
import { memoryService } from '@lenserfight/data/repositories'
import { Badge, Button, Table, type Column } from '@lenserfight/ui/components'
import { SelectField, TextArea } from '@lenserfight/ui/forms'
import { AlertDialog, Drawer } from '@lenserfight/ui/overlays'
import type {
  AgentMemoryAccessLogRecord,
  AgentMemoryEntryRecord,
  MemoryScope,
  MemorySource,
} from '@lenserfight/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Brain, ShieldOff } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { DrawerDocsLink } from './DrawerDocsLink'

type Mode = 'view' | 'create'

interface MemoryEntryDrawerProps {
  open: boolean
  onClose: () => void
  profileId: string | null
  entry?: AgentMemoryEntryRecord | null
  canManage: boolean
  onChanged?: () => void
}

const SCOPE_OPTIONS = [
  { value: 'project', label: 'project' },
  { value: 'conversation', label: 'conversation' },
  { value: 'global', label: 'global' },
]

const SOURCE_OPTIONS = [
  { value: 'manual', label: 'manual' },
  { value: 'user', label: 'user' },
  { value: 'agent', label: 'agent' },
  { value: 'tool', label: 'tool' },
  { value: 'eval', label: 'eval' },
]

const ACTION_BADGE: Record<AgentMemoryAccessLogRecord['action'], 'gray' | 'green' | 'red'> = {
  read: 'gray',
  write: 'green',
  redact: 'red',
}

export const MemoryEntryDrawer: React.FC<MemoryEntryDrawerProps> = ({
  open,
  onClose,
  profileId,
  entry,
  canManage,
  onChanged,
}) => {
  const mode: Mode = entry ? 'view' : 'create'
  const queryClient = useQueryClient()

  const [content, setContent] = useState('')
  const [scope, setScope] = useState<MemoryScope>('project')
  const [source, setSource] = useState<MemorySource>('manual')
  const [confidence, setConfidence] = useState(0.7)
  const [confirmRedact, setConfirmRedact] = useState(false)

  useEffect(() => {
    if (!open) return
    setContent('')
    setScope('project')
    setSource('manual')
    setConfidence(0.7)
    setConfirmRedact(false)
  }, [open, entry?.id])

  const accessLogsQuery = useQuery<AgentMemoryAccessLogRecord[]>({
    queryKey: queryKeys.agents.memoryAccessLogs(entry?.id ?? ''),
    queryFn: () => memoryService.listMemoryAccessLogs(entry!.id, 25),
    enabled: open && mode === 'view' && !!entry?.id,
    staleTime: 10_000,
  })

  const writeMutation = useMutation({
    mutationFn: () =>
      memoryService.writeMemoryEntry({
        profile_id: profileId!,
        scope,
        source,
        content: content.trim(),
        confidence,
      }),
    onSuccess: () => {
      toast.success('Memory entry saved')
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.memoryEntries(profileId ?? ''),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.memoryProfileSummary(profileId ?? ''),
      })
      onChanged?.()
      onClose()
    },
    onError: (cause) => toast.error((cause as Error).message),
  })

  const redactMutation = useMutation({
    mutationFn: () => memoryService.redactMemoryEntry(entry!.id, 'manual redact'),
    onSuccess: () => {
      toast.success('Memory entry redacted')
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.memoryEntries(profileId ?? ''),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.memoryAccessLogs(entry?.id ?? ''),
      })
      onChanged?.()
      onClose()
    },
    onError: (cause) => toast.error((cause as Error).message),
    onSettled: () => setConfirmRedact(false),
  })

  const accessColumns: Column<AgentMemoryAccessLogRecord>[] = [
    {
      header: 'Action',
      render: (row) => (
        <Badge color={ACTION_BADGE[row.action]} variant="solid">
          {row.action}
        </Badge>
      ),
    },
    {
      header: 'When',
      render: (row) => new Date(row.accessed_at).toLocaleString(),
    },
    {
      header: 'Run',
      render: (row) =>
        row.team_run_id ? (
          <span className="font-mono text-xs">{row.team_run_id.slice(0, 8)}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
  ]

  const isCreateValid = content.trim().length > 0 && profileId

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="w-[560px]"
      title={mode === 'create' ? 'Write memory entry' : 'Memory entry'}
      headerExtra={
        <DrawerDocsLink
          path="/how-to/agents/workspace/drawers/memory-entry"
          tip="Inspect or edit a single short-lived memory entry. Content, recall score (decays with age), source run, TTL, and tags."
        />
      }
    >
      <div className="space-y-5">
        {mode === 'view' && entry ? (
          <>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-wrap items-center gap-2">
                <Badge color="blue">{entry.scope}</Badge>
                <Badge color="purple">{entry.source}</Badge>
                <Badge color="yellow">conf {(entry.confidence * 100).toFixed(0)}%</Badge>
                {entry.is_redacted && (
                  <Badge color="red" variant="outline">
                    redacted
                  </Badge>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-200">
                {entry.content}
              </p>
              <p className="mt-3 text-xs text-gray-400">
                Created {new Date(entry.created_at).toLocaleString()}
                {entry.expires_at ? ` · expires ${new Date(entry.expires_at).toLocaleString()}` : ''}
              </p>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Access log
              </h4>
              <Table<AgentMemoryAccessLogRecord>
                columns={accessColumns}
                data={accessLogsQuery.data ?? []}
                keyExtractor={(row) => row.id}
                isLoading={accessLogsQuery.isLoading}
                emptyState={
                  <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    No access events recorded yet.
                  </div>
                }
              />
            </div>

            {canManage && !entry.is_redacted && (
              <div className="flex justify-end">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmRedact(true)}
                  isLoading={redactMutation.isPending}
                >
                  <ShieldOff size={14} className="mr-2 inline" />
                  Redact entry
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Brain size={14} />
                Manual memory entries are written immediately and visible to the agent on the next run.
              </div>
              <SelectField
                label="Scope"
                value={scope}
                onChange={(v) => setScope(v as MemoryScope)}
                options={SCOPE_OPTIONS}
              />
              <div className="mt-3">
                <SelectField
                  label="Source"
                  value={source}
                  onChange={(v) => setSource(v as MemorySource)}
                  options={SOURCE_OPTIONS}
                />
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-greyscale-700 dark:text-greyscale-300">
                  Confidence ({(confidence * 100).toFixed(0)}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  className="w-full accent-primary-yellow-500"
                />
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-greyscale-700 dark:text-greyscale-300">
                  Content
                </label>
                <TextArea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What should the agent remember?"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => writeMutation.mutate()}
                isLoading={writeMutation.isPending}
                disabled={!isCreateValid}
              >
                Save entry
              </Button>
            </div>
          </>
        )}
      </div>

      <AlertDialog
        open={confirmRedact}
        onClose={() => setConfirmRedact(false)}
        title="Redact memory entry?"
        bodyText="The content will be replaced with [redacted] and an audit log row will be written. This cannot be undone."
        variant="destructive"
        confirmAction={{
          label: 'Redact',
          onClick: () => redactMutation.mutate(),
          loading: redactMutation.isPending,
        }}
      />
    </Drawer>
  )
}
