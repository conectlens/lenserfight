import { supabase } from '@lenserfight/data/supabase'
import { Button, Card } from '@lenserfight/ui/components'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Plus, Swords, Trash2 } from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { NewBattleSubscriptionDrawer } from '../drawers/NewBattleSubscriptionDrawer'
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

  const [drawerOpen, setDrawerOpen] = useState(false)

  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['agent-battle-subscriptions', agentId] }),
    [queryClient, agentId],
  )

  const unsubscribe = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase.rpc('fn_agent_unsubscribe_from_battles', {
        p_subscription_id: subscriptionId,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast.success('Subscription deactivated')
      invalidate()
    },
    onError: (e) => toast.error((e as Error).message),
  })

  const handleDeactivate = useCallback(
    (id: string) => unsubscribe.mutate(id),
    [unsubscribe],
  )

  const { active, inactive } = useMemo(() => {
    const a: BattleSubscription[] = []
    const i: BattleSubscription[] = []
    for (const s of subscriptions) (s.active ? a : i).push(s)
    return { active: a, inactive: i }
  }, [subscriptions])

  return (
    <SectionPage
      eyebrow="Battles"
      docsPath="/how-to/agents/workspace/battles"
      docsTip="Auto-enroll this agent into matching open battles. Daily caps, stake limits, and a kill switch protect against runaway joins."
      title="Battle subscriptions"
      description="Auto-enroll this agent into open battles matching the configured filters. Rate limits and kill switches protect against runaway joins."
      toolbar={
        canManage ? (
          <Button
            type="button"
            onClick={openDrawer}
          >
            <Plus size={16} />
            New subscription
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : active.length === 0 && inactive.length === 0 ? (
        <EmptyPanel
          icon={<Swords size={20} />}
          title="No subscriptions yet"
          description="Create a subscription to auto-enroll this agent in matching battles when they open."
        >
          {canManage && (
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="dark"
                onClick={openDrawer}
              >
                New subscription
              </Button>
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
              onDeactivate={handleDeactivate}
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
                  onDeactivate={handleDeactivate}
                  isDeactivating={false}
                />
              ))}
            </>
          )}
        </div>
      )}

      <NewBattleSubscriptionDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        agentId={agentId}
        onCreated={invalidate}
      />
    </SectionPage>
  )
}

interface SubscriptionCardProps {
  sub: BattleSubscription
  canManage: boolean
  onDeactivate: (id: string) => void
  isDeactivating: boolean
}

const SubscriptionCard = React.memo(function SubscriptionCard({
  sub,
  canManage,
  onDeactivate,
  isDeactivating,
}: SubscriptionCardProps) {
  const handleClick = useCallback(() => onDeactivate(sub.id), [onDeactivate, sub.id])

  return (
    <Card className="!p-5 transition-all hover:border-primary-yellow-200 dark:hover:border-primary-yellow-500/20">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Swords size={14} className="text-primary-yellow-500" />
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
              <span className="flex items-center gap-1 rounded-full border border-primary-yellow-200 px-2.5 py-0.5 text-[11px] font-semibold text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300">
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
          <Button
            type="button"
            variant="ghost"
            onClick={handleClick}
            disabled={isDeactivating}
            className="flex-shrink-0 rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
            aria-label="Deactivate subscription"
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>
    </Card>
  )
})
