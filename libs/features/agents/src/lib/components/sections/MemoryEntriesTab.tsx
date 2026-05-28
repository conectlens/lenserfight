import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService, memoryService } from '@lenserfight/data/repositories'
import { Badge, Button, Table, type Column } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import type {
  AgentMemoryEntryRecord,
  AgentMemoryProfileRecord,
} from '@lenserfight/types'
import { useQuery } from '@tanstack/react-query'
import { Brain, Plus } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import { MemoryEntryDrawer } from '../drawers/MemoryEntryDrawer'
import { EmptyPanel } from '../EmptyPanel'

interface MemoryEntriesTabProps {
  aiLenserId: string
  isOwner: boolean
}

const SCOPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All scopes' },
  { value: 'project', label: 'project' },
  { value: 'conversation', label: 'conversation' },
  { value: 'global', label: 'global' },
]

const SOURCE_BADGE: Record<string, 'gray' | 'blue' | 'green' | 'yellow' | 'purple'> = {
  user: 'blue',
  agent: 'green',
  tool: 'yellow',
  eval: 'purple',
  manual: 'gray',
}

export const MemoryEntriesTab: React.FC<MemoryEntriesTabProps> = ({ aiLenserId, isOwner }) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [scopeFilter, setScopeFilter] = useState<string>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'view' | 'create'>('view')
  const [activeEntry, setActiveEntry] = useState<AgentMemoryEntryRecord | null>(null)

  const profilesQuery = useQuery<AgentMemoryProfileRecord[]>({
    queryKey: queryKeys.agents.memoryProfiles(aiLenserId),
    queryFn: () => agentWorkspaceService.listMemoryProfiles(aiLenserId),
    staleTime: 15_000,
  })

  const profiles = profilesQuery.data ?? []

  const profileOptions = useMemo(
    () => profiles.map((p) => ({ value: p.id, label: p.name })),
    [profiles]
  )

  const effectiveProfileId = selectedProfileId || profiles[0]?.id || ''

  const entriesQuery = useQuery<AgentMemoryEntryRecord[]>({
    queryKey: queryKeys.agents.memoryEntries(effectiveProfileId, scopeFilter),
    queryFn: () =>
      memoryService.listMemoryEntries(effectiveProfileId, {
        scope: scopeFilter === 'all' ? undefined : (scopeFilter as 'project' | 'conversation' | 'global'),
        limit: 100,
      }),
    enabled: !!effectiveProfileId,
    staleTime: 5_000,
  })

  const entries = entriesQuery.data ?? []

  const columns: Column<AgentMemoryEntryRecord>[] = [
    {
      header: 'Content',
      render: (entry) => (
        <div className="max-w-[420px]">
          <p className={`truncate text-sm ${entry.is_redacted ? 'italic text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
            {entry.content}
          </p>
        </div>
      ),
    },
    {
      header: 'Scope',
      render: (entry) => <Badge color="blue">{entry.scope}</Badge>,
    },
    {
      header: 'Source',
      render: (entry) => (
        <Badge color={SOURCE_BADGE[entry.source] ?? 'gray'}>{entry.source}</Badge>
      ),
    },
    {
      header: 'Conf',
      render: (entry) => (
        <span className="text-xs font-mono text-gray-600 dark:text-gray-300">
          {(entry.confidence * 100).toFixed(0)}%
        </span>
      ),
    },
    {
      header: 'Created',
      render: (entry) => (
        <span className="whitespace-nowrap text-xs text-gray-500">
          {new Date(entry.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: '',
      render: (entry) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActiveEntry(entry)
              setDrawerMode('view')
              setDrawerOpen(true)
            }}
          >
            Open
          </Button>
        </div>
      ),
    },
  ]

  if (profiles.length === 0) {
    return (
      <EmptyPanel
        icon={<Brain size={20} />}
        title="No memory profiles yet"
        description="Create a memory profile under the Profiles tab before writing or reading entries."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <SelectField
          label="Memory profile"
          value={effectiveProfileId}
          onChange={setSelectedProfileId}
          options={profileOptions}
        />
        <SelectField
          label="Scope filter"
          value={scopeFilter}
          onChange={setScopeFilter}
          options={SCOPE_FILTER_OPTIONS}
        />
      </div>

      {isOwner && (
        <div className="flex justify-end">
          <Button
            variant="dark"
            size="sm"
            onClick={() => {
              setActiveEntry(null)
              setDrawerMode('create')
              setDrawerOpen(true)
            }}
          >
            <Plus size={14} className="mr-2 inline" />
            Write entry
          </Button>
        </div>
      )}

      <Table<AgentMemoryEntryRecord>
        columns={columns}
        data={entries}
        keyExtractor={(row) => row.id}
        isLoading={entriesQuery.isLoading}
        emptyState={
          <EmptyPanel
            icon={<Brain size={20} />}
            title="No memory entries"
            description="Entries appear here after a successful run writes them, or when you add a manual entry above."
          />
        }
      />

      <MemoryEntryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profileId={effectiveProfileId}
        entry={drawerMode === 'view' ? activeEntry : null}
        canManage={isOwner}
      />
    </div>
  )
}
