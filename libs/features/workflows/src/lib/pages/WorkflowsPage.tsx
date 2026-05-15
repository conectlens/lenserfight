import { seoService } from '@lenserfight/data/repositories'
import { useLenser } from '@lenserfight/features/profile'
import { Button, EmptyState, HelpButton, InfiniteScrollSentinel, PageHeader } from '@lenserfight/ui/components'
import { PageMeta } from '@lenserfight/ui/layout'
import { SearchBar, SelectField } from '@lenserfight/ui/forms'
import { ArrowRight, GitBranch, ImageIcon, Plus, Search, Sparkles, Video } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { Link, Outlet, useSearchParams } from 'react-router-dom'

import { WorkflowCard } from '../components/WorkflowCard'
import { WorkflowTemplateCarousel } from '../components/WorkflowTemplateCarousel'
import { useForkWorkflow } from '../hooks/useForkWorkflow'
import { usePopularWorkflows } from '../hooks/usePopularWorkflows'
import { useTemplateWorkflows } from '../hooks/useTemplateWorkflows'
import { useWorkflows } from '../hooks/useWorkflows'

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
]

interface WorkflowsPageProps {
  onCreateWorkflow: () => void
}

export function WorkflowsPage({ onCreateWorkflow }: WorkflowsPageProps) {
  const { lenser } = useLenser()
  const [searchParams, setSearchParams] = useSearchParams()

  const scope = (searchParams.get('scope') ?? 'mine') as 'mine' | 'popular'
  const visibility = searchParams.get('visibility') ?? 'all'
  const sort = (searchParams.get('sort') ?? 'updated_at') as 'updated_at' | 'created_at'
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
  const templates = useTemplateWorkflows(8)
  const forkWorkflow = useForkWorkflow()

  const active = scope === 'popular' ? popularWorkflows : myWorkflows
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = active

  const workflows = useMemo(() => data?.pages.flatMap((p) => p.data ?? []) ?? [], [data])

  const commitSearch = (value: string) => setParam('q', value, '')

  const wfListMeta = seoService.getWorkflowsListMeta()

  return (
    <div className="">
      <PageMeta title={wfListMeta.title} description={wfListMeta.description} />
      <PageHeader
        title="Connected Lenses & AI Workflows"
        description="Run reusable, multi-step AI pipelines that turn an idea into copy, media prompts, scripts, code, or launch assets."
        action={
          <>
            <HelpButton path="/tutorials/walkthroughs/create-a-workflow" />
            <Button onClick={onCreateWorkflow} className="gap-2 w-auto flex-shrink-0">
              <Plus size={15} /> New Workflow
            </Button>
          </>
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

      {/* Start from template strip — always visible (tiny, horizontally-scrolling) */}
      <WorkflowTemplateCarousel
        templates={templates.data ?? []}
        isLoading={templates.isLoading}
        isForking={forkWorkflow.isPending}
        onFork={(id) => forkWorkflow.mutate(id)}
      />

      {isLoading && (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="break-inside-avoid mb-3 h-32 rounded-2xl border border-surface-border bg-surface-raised animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && workflows.length === 0 && scope === 'mine' && (
        <EmptyState
          icon={GitBranch}
          title="Build your first workflow"
          description="Turn an idea into text, image prompts, video scripts, code, or a full launch kit with visible stages."
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
          title="No popular workflows match this view"
          description="Public reusable workflows will appear here as Lensers share multi-step AI pipelines."
        />
      )}

      {!isLoading && workflows.length > 0 && (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3">
          {workflows.map((w) => (
            <div key={w.id} className="break-inside-avoid mb-3">
              <Link to={`/workflows/${w.id}`} className="block">
                <WorkflowCard workflow={w} nodeCount={w.node_count} showReactions />
              </Link>
            </div>
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
