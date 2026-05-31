import { SEOHead } from '@lenserfight/ui/components'
import { battlesService, lensesService } from '@lenserfight/data/repositories'
import { supabase } from '@lenserfight/data/supabase'
import { useQuery } from '@tanstack/react-query'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'

import { BattleStatusBadge } from '../components/display/BattleStatusBadge'

type Tab = 'battles' | 'lensers' | 'lenses'

const TABS: { id: Tab; label: string }[] = [
  { id: 'battles', label: 'Battles' },
  { id: 'lensers', label: 'Lensers' },
  { id: 'lenses', label: 'Lenses' },
]

function BattlesTab() {
  const { data: raw, isLoading } = useQuery({
    queryKey: ['leaderboard-battles'],
    queryFn: () => battlesService.getBattlesFeedItems({ limit: 50 }),
    staleTime: 60_000,
  })
  // Sort client-side by total_vote_count desc
  const data = raw?.slice().sort((a, b) => (b.total_vote_count ?? 0) - (a.total_vote_count ?? 0))

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-surface-raised animate-pulse" />
        ))}
      </div>
    )
  }

  const items = data ?? []
  if (items.length === 0) {
    return <p className="text-sm text-surface-text-muted py-4">No battles found.</p>
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] font-semibold text-surface-text-muted uppercase tracking-wide border-b border-surface-border">
          <th className="py-2 pr-3 w-8">#</th>
          <th className="py-2 pr-3">Title</th>
          <th className="py-2 pr-3">Status</th>
          <th className="py-2 text-right">Votes</th>
        </tr>
      </thead>
      <tbody>
        {items.map((b, i) => (
          <tr key={b.id} className="border-b border-surface-border/50 hover:bg-surface-raised/50">
            <td className="py-2 pr-3 text-surface-text-muted tabular-nums">{i + 1}</td>
            <td className="py-2 pr-3">
              <Link
                to={`/battles/${b.slug}`}
                className="font-medium text-surface-text hover:text-primary truncate block max-w-xs"
              >
                {b.title}
              </Link>
            </td>
            <td className="py-2 pr-3">
              <BattleStatusBadge status={b.status as 'published' | 'voting' | 'draft'} />
            </td>
            <td className="py-2 text-right tabular-nums text-surface-text-muted">
              {(b.total_vote_count ?? 0).toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface LenserRow {
  lenser_id: string
  handle: string
  display_name: string
  total_votes: number
  battle_wins: number
}

function LensersTab() {
  const { data, isLoading, isError } = useQuery<LenserRow[]>({
    queryKey: ['leaderboard-lensers'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_get_lenserboard', { p_limit: 50 })
      if (error) throw error
      return (data as LenserRow[]) ?? []
    },
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-surface-raised animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-surface-text-muted py-4">Leaderboard data loading</p>
    )
  }

  const rows = data ?? []
  if (rows.length === 0) {
    return <p className="text-sm text-surface-text-muted py-4">No lensers found.</p>
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] font-semibold text-surface-text-muted uppercase tracking-wide border-b border-surface-border">
          <th className="py-2 pr-3 w-8">#</th>
          <th className="py-2 pr-3">Lenser</th>
          <th className="py-2 pr-3 text-right">Wins</th>
          <th className="py-2 text-right">Total Votes</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.lenser_id} className="border-b border-surface-border/50 hover:bg-surface-raised/50">
            <td className="py-2 pr-3 text-surface-text-muted tabular-nums">{i + 1}</td>
            <td className="py-2 pr-3">
              <Link
                to={`/lensers/${r.handle}`}
                className="font-medium text-surface-text hover:text-primary"
              >
                {r.display_name}
                <span className="ml-1 text-[11px] text-surface-text-muted">@{r.handle}</span>
              </Link>
            </td>
            <td className="py-2 pr-3 text-right tabular-nums text-surface-text-muted">{r.battle_wins ?? 0}</td>
            <td className="py-2 text-right tabular-nums text-surface-text-muted">{(r.total_votes ?? 0).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function LensesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard-lenses'],
    queryFn: () => lensesService.getLenses(0, 50),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-surface-raised animate-pulse" />
        ))}
      </div>
    )
  }

  const items = data?.data ?? []
  if (items.length === 0) {
    return <p className="text-sm text-surface-text-muted py-4">No lenses found.</p>
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] font-semibold text-surface-text-muted uppercase tracking-wide border-b border-surface-border">
          <th className="py-2 pr-3 w-8">#</th>
          <th className="py-2 pr-3">Name</th>
          <th className="py-2 pr-3">Owner</th>
          <th className="py-2 text-right">Runs</th>
        </tr>
      </thead>
      <tbody>
        {items.map((l, i) => (
          <tr key={l.id} className="border-b border-surface-border/50 hover:bg-surface-raised/50">
            <td className="py-2 pr-3 text-surface-text-muted tabular-nums">{i + 1}</td>
            <td className="py-2 pr-3">
              <Link
                to={`/lenses/${l.id}`}
                className="font-medium text-surface-text hover:text-primary truncate block max-w-xs"
              >
                {l.title}
              </Link>
            </td>
            <td className="py-2 pr-3 text-surface-text-muted text-[12px]">
              {l.author?.displayName ?? '—'}
            </td>
            <td className="py-2 text-right tabular-nums text-surface-text-muted">
              {(l.usageCount ?? 0).toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('battles')

  return (
    <>
      <SEOHead
        title="Leaderboard — LenserFight"
        description="Top battles, lensers, and lenses ranked by community engagement."
      />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-bold text-surface-text mb-6">Leaderboard</h1>

        {/* Tab bar */}
        <div className="flex gap-1 rounded-xl border border-surface-border bg-surface-raised p-1 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-surface-base text-surface-text shadow-sm'
                  : 'text-surface-text-muted hover:text-surface-text',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'battles' && <BattlesTab />}
          {activeTab === 'lensers' && <LensersTab />}
          {activeTab === 'lenses' && <LensesTab />}
        </div>
      </div>
    </>
  )
}
