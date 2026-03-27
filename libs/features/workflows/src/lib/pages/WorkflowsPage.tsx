import { queryKeys } from '@lenserfight/data/cache'
import type { WorkflowRecord } from '@lenserfight/data/repositories'
import { workflowsService } from '@lenserfight/data/repositories'
import { useLenser } from '@lenserfight/features/profile'
import { Button, EmptyState, InfiniteScrollSentinel, PageHeader } from '@lenserfight/ui/components'
import { SearchBar, SelectField } from '@lenserfight/ui/forms'
import { useQuery } from '@tanstack/react-query'
import { GitBranch, Plus, Search } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { Link, Outlet, useSearchParams } from 'react-router-dom'

import { WorkflowCard } from '../components/WorkflowCard'
import { usePopularWorkflows } from '../hooks/usePopularWorkflows'
import { useWorkflows } from '../hooks/useWorkflows'

// Per-card node count loader — only fetches nodes (not full detail) to avoid N+1 getById calls.
function WorkflowCardWithNodes({ workflow }: { workflow: WorkflowRecord }) {
  const { data: nodes = [] } = useQuery({
    queryKey: queryKeys.workflows.nodes(workflow.id),
    queryFn: () => workflowsService.getNodes(workflow.id),
    staleTime: 1000 * 30,
  })
  return (
    <Link to={`/workflows/${workflow.id}`} className="block">
      <WorkflowCard workflow={workflow} nodes={nodes} showReactions />
    </Link>
  )
}

const SCOPE_OPTIONS = [
  { value: 'mine', label: 'My Workflows' },
  { value: 'popular', label: 'Popular' },
]

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
}

export function WorkflowsPage({ onCreateWorkflow }: WorkflowsPageProps) {
  const { lenser } = useLenser()
  const [searchParams, setSearchParams] = useSearchParams()

  const scope = (searchParams.get('scope') ?? 'mine') as 'mine' | 'popular'
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

  const myFilter = useMemo(
    () => ({
      visibility: visibility !== 'all' ? (visibility as 'public' | 'private' | 'unlisted') : undefined,
      sort,
      search: search || undefined,
    }),
    [visibility, sort, search]
  )

  const myWorkflows = useWorkflows(lenser?.id, myFilter)
  const popularWorkflows = usePopularWorkflows({ search: search || undefined }, scope === 'popular')

  const active = scope === 'popular' ? popularWorkflows : myWorkflows
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = active

  const workflows = useMemo(() => data?.pages.flatMap((p) => p.data ?? []) ?? [], [data])

  const commitSearch = (value: string) => setParam('q', value, '')

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
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <SearchBar
          className="flex-1 min-w-[180px]"
          value={searchInput}
          placeholder="Search workflows…"
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commitSearch(searchInput) }}
          onBlur={() => commitSearch(searchInput)}
          onClear={() => { setSearchInput(''); commitSearch('') }}
        />
        <SelectField
          value={scope}
          onChange={(v) => setParam('scope', v, 'mine')}
          options={SCOPE_OPTIONS}
          className="w-44"
        />
        {scope === 'mine' && (
          <>
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
          </>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl border border-surface-border bg-surface-raised animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && workflows.length === 0 && scope === 'mine' && (
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

      {!isLoading && workflows.length === 0 && scope === 'popular' && (
        <EmptyState
          icon={Search}
          title="No popular workflows yet"
          description="Public workflows will appear here as the community starts sharing them."
        />
      )}

      {!isLoading && workflows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {workflows.map((w) => (
            <WorkflowCardWithNodes
              key={w.id}
              workflow={w}
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
