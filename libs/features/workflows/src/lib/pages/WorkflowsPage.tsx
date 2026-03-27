import { queryKeys } from '@lenserfight/data/cache'
import type { WorkflowRecord } from '@lenserfight/data/repositories'
import { workflowsService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { Button, EmptyState, InfiniteScrollSentinel, PageHeader } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { useQuery } from '@tanstack/react-query'
import { GitBranch, Plus, Search } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { Outlet, useSearchParams } from 'react-router-dom'

import { WorkflowCard } from '../components/WorkflowCard'
import { useWorkflows } from '../hooks/useWorkflows'

// Per-card node count loader — only fetches nodes (not full detail) to avoid N+1 getById calls.
// Receives workflow from the list to fix the `if (!workflow) return null` bug.
function WorkflowCardWithNodes({ workflow, onOpen }: { workflow: WorkflowRecord; onOpen: () => void }) {
  const { data: nodes = [] } = useQuery({
    queryKey: queryKeys.workflows.nodes(workflow.id),
    queryFn: () => workflowsService.getNodes(workflow.id),
    staleTime: 1000 * 30,
  })
  return <WorkflowCard workflow={workflow} nodes={nodes} onClick={onOpen} />
}

const VISIBILITY_OPTIONS = [
  { value: 'all', label: 'All visibility' },
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'unlisted', label: 'Unlisted' },
]

const SORT_OPTIONS = [
  { value: 'updated_at', label: 'Last updated' },
  { value: 'created_at', label: 'Newest' },
  { value: 'battle_count', label: 'Most battles' },
]

interface WorkflowsPageProps {
  onCreateWorkflow: () => void
  onOpenWorkflow: (workflowId: string) => void
}

export function WorkflowsPage({ onCreateWorkflow, onOpenWorkflow }: WorkflowsPageProps) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const visibility = searchParams.get('visibility') ?? 'all'
  const sort = (searchParams.get('sort') ?? 'updated_at') as 'updated_at' | 'created_at' | 'battle_count'
  const search = searchParams.get('q') ?? ''

  const [searchInput, setSearchInput] = useState(search)

  const setParam = (key: string, value: string, defaultValue: string) => {
    setSearchParams(
      (prev) => {
        if (value !== defaultValue) prev.set(key, value)
        else prev.delete(key)
        return prev
      },
      { replace: true }
    )
  }

  const filter = useMemo(
    () => ({
      visibility: visibility !== 'all' ? (visibility as 'public' | 'private' | 'unlisted') : undefined,
      sort,
      search: search || undefined,
    }),
    [visibility, sort, search]
  )

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useWorkflows(user?.id, filter)

  const workflows = useMemo(() => data?.pages.flatMap((p) => p.data ?? []) ?? [], [data])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setParam('q', searchInput, '')
    }
  }

  return (
    <div className="">
      <PageHeader
        title="Connected Lenses"
        description="Chain lenses into multi-step workflows and battle them end-to-end."
        action={
          <Button onClick={onCreateWorkflow} className="gap-2 w-auto flex-shrink-0">
            <Plus size={15} /> New Workflow
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-greyscale-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search workflows…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onBlur={() => setParam('q', searchInput, '')}
            className="w-full rounded-2xl border border-surface-border bg-surface-base pl-8 pr-3 py-2 text-sm text-greyscale-900 placeholder:text-greyscale-400 outline-none focus:border-status-blue dark:bg-surface-raised dark:text-greyscale-50"
          />
        </div>
        <SelectField
          value={visibility}
          onChange={(v) => setParam('visibility', v, 'all')}
          options={VISIBILITY_OPTIONS}
          className="w-40"
        />
        <SelectField
          value={sort}
          onChange={(v) => setParam('sort', v, 'updated_at')}
          options={SORT_OPTIONS}
          className="w-40"
        />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl border border-surface-border bg-surface-raised animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && workflows.length === 0 && (
        <EmptyState
          icon={GitBranch}
          title="Build your first Connected Lens workflow"
          description="Chain lenses together and watch AI outputs transform step by step."
          action={
            <Button onClick={onCreateWorkflow} className="gap-2 w-auto">
              <Plus size={15} /> Create Workflow
            </Button>
          }
        />
      )}

      {!isLoading && workflows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {workflows.map((w) => (
            <WorkflowCardWithNodes
              key={w.id}
              workflow={w}
              onOpen={() => onOpenWorkflow(w.id)}
            />
          ))}
        </div>
      )}

      <InfiniteScrollSentinel
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />

      {/* Nested modal outlet — renders /workflows/manage modal overlay */}
      <Outlet />
    </div>
  )
}
