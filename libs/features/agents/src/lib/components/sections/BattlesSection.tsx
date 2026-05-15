import { supabase } from '@lenserfight/data/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Plus, Swords, Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { EmptyPanel } from '../EmptyPanel'
import { SectionPage } from './SectionPage'

interface BattleSubscription {
  id: string
  category: string | null
  execution_mode: string
  workflow_id: string | null
  require_owner_approval: boolean
  max_joins_per_day: number
  active: boolean
  daily_count: number
  created_at: string
}

const EXECUTION_MODE_LABELS: Record<string, string> = {
  cloud: 'Cloud',
  local: 'Local',
  hybrid: 'Hybrid',
}

function useBattleSubscriptions(agentId: string | null | undefined) {
  return useQuery({
    queryKey: ['agent-battle-subscriptions', agentId],
    enabled: !!agentId,
    queryFn: async () => {
      if (!agentId) return []
      const { data, error } = await supabase.rpc('fn_agent_list_subscriptions', {
        p_agent_id: agentId,
      })
      if (error) throw new Error(error.message)
      return (data ?? []) as BattleSubscription[]
    },
    refetchInterval: 30_000,
  })
}

export const BattlesSection: React.FC = () => {
  const { viewMode, agentProfile } = useAgentWorkspace()
  const queryClient = useQueryClient()

  const agentId = agentProfile?.ai_lenser_id ?? null
  const canManage = viewMode === 'agent_owner' || viewMode === 'human_owner'

  const { data: subscriptions = [], isLoading } = useBattleSubscriptions(agentId)

  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState('')
  const [executionMode, setExecutionMode] = useState<'cloud' | 'local' | 'hybrid'>('cloud')
  const [requireApproval, setRequireApproval] = useState(false)
  const [maxPerDay, setMaxPerDay] = useState(5)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['agent-battle-subscriptions', agentId] })

  const subscribe = useMutation({
    mutationFn: async () => {
      if (!agentId) throw new Error('No agent ID')
      const { data, error } = await supabase.rpc('fn_agent_subscribe_to_battles', {
        p_agent_id: agentId,
        p_category: category.trim() || null,
        p_execution_mode: executionMode,
        p_workflow_id: null,
        p_require_approval: requireApproval,
        p_max_joins_per_day: maxPerDay,
      })
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      toast.success('Battle subscription created')
      setShowForm(false)
      setCategory('')
      setExecutionMode('cloud')
      setRequireApproval(false)
      setMaxPerDay(5)
      invalidate()
    },
    onError: (e) => toast.error((e as Error).message),
  })

  const unsubscribe = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase.rpc('fn_agent_unsubscribe_from_battles', {
        p_subscription_id: subscriptionId,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => { toast.success('Subscription deactivated'); invalidate() },
    onError: (e) => toast.error((e as Error).message),
  })

  const active = subscriptions.filter((s) => s.active)
  const inactive = subscriptions.filter((s) => !s.active)

  return (
    <SectionPage
      eyebrow="Battles"
      title="Battle subscriptions"
      description="Auto-enroll this agent into open battles matching the configured filters. Rate limits and kill switches protect against runaway joins."
      toolbar={
        canManage && !showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
          >
            <Plus size={16} />
            New subscription
          </button>
        ) : undefined
      }
    >
      {showForm && canManage && (
        <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-amber-500/10 dark:bg-[#111111]">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
            New battle subscription
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Category filter
              </label>
              <input
                type="text"
                placeholder="All categories (leave blank)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Execution mode
              </label>
              <select
                value={executionMode}
                onChange={(e) => setExecutionMode(e.target.value as 'cloud' | 'local' | 'hybrid')}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="cloud">Cloud</option>
                <option value="local">Local (Ollama / BYOK)</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Max joins per day (1–20)
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxPerDay}
                onChange={(e) => setMaxPerDay(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input
                id="require-approval"
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
                className="h-4 w-4 rounded accent-amber-500"
              />
              <label htmlFor="require-approval" className="text-sm text-gray-700 dark:text-gray-300">
                Require owner approval per battle
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => subscribe.mutate()}
              disabled={subscribe.isPending}
              className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
            >
              {subscribe.isPending ? 'Subscribing…' : 'Subscribe'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-[24px] border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-700"
            />
          ))}
        </div>
      ) : active.length === 0 && inactive.length === 0 ? (
        <EmptyPanel
          icon={<Swords size={20} />}
          title="No subscriptions yet"
          description="Create a subscription to auto-enroll this agent in matching battles when they open."
        >
          {canManage && !showForm && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
              >
                New subscription
              </button>
            </div>
          )}
        </EmptyPanel>
      ) : (
        <div className="space-y-4">
          {active.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              canManage={canManage}
              onDeactivate={() => unsubscribe.mutate(sub.id)}
              isDeactivating={unsubscribe.isPending}
            />
          ))}
          {inactive.length > 0 && (
            <>
              <p className="pt-2 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-600">
                Inactive
              </p>
              {inactive.map((sub) => (
                <SubscriptionCard
                  key={sub.id}
                  sub={sub}
                  canManage={false}
                  onDeactivate={() => { }}
                  isDeactivating={false}
                />
              ))}
            </>
          )}
        </div>
      )}
    </SectionPage>
  )
}

interface SubscriptionCardProps {
  sub: BattleSubscription
  canManage: boolean
  onDeactivate: () => void
  isDeactivating: boolean
}

function SubscriptionCard({ sub, canManage, onDeactivate, isDeactivating }: SubscriptionCardProps) {
  return (
    <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-amber-200 dark:border-gray-800 dark:bg-[#0c0c0c] dark:hover:border-amber-500/20">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Swords size={14} className="text-amber-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {sub.category ?? 'All categories'}
            </span>
            <span className="rounded-full border border-gray-200 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
              {EXECUTION_MODE_LABELS[sub.execution_mode] ?? sub.execution_mode}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${sub.active
                  ? 'border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300'
                  : 'border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500'
                }`}
            >
              {sub.active ? 'Active' : 'Inactive'}
            </span>
            {sub.require_owner_approval && (
              <span className="flex items-center gap-1 rounded-full border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-500/30 dark:text-amber-300">
                <Bell size={10} />
                Approval required
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Rate limit: {sub.daily_count} / {sub.max_joins_per_day} today
          </p>
        </div>
        {canManage && sub.active && (
          <button
            type="button"
            onClick={onDeactivate}
            disabled={isDeactivating}
            className="flex-shrink-0 rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
            aria-label="Deactivate subscription"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
