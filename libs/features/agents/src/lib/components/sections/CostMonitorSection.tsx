import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Sparkles } from 'lucide-react'
import React from 'react'
import { EmptyPanel } from '../EmptyPanel'

interface CostMonitorSectionProps {
  aiLenserId: string
}

const formatCredits = (n: number) => n.toLocaleString()

/**
 * Cost monitor — aggregates `agents.quota_snapshots` daily counters and
 * surfaces today / 7d / 30d totals plus the per-day breakdown. The agent's
 * spending ceiling is read from `agents.policies.spending_limit_credits`;
 * a value of -1 (or null) is treated as "unlimited".
 */
export const CostMonitorSection: React.FC<CostMonitorSectionProps> = ({ aiLenserId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.agents.costSummary(aiLenserId),
    queryFn: () => agentWorkspaceService.getCostSummary(aiLenserId),
    enabled: !!aiLenserId,
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-28 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
            />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Cost summary failed to load</p>
            <p className="mt-1">{(error as Error).message}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <EmptyPanel
        icon={<Sparkles size={22} />}
        title="No cost data yet"
        description="This agent has no recorded spending. Quota snapshots are written lazily on first action."
      />
    )
  }

  const hasNoData =
    data.today_credits === 0 &&
    data.seven_day_credits === 0 &&
    data.thirty_day_credits === 0 &&
    data.daily.length === 0

  if (hasNoData) {
    return (
      <EmptyPanel
        icon={<Sparkles size={22} />}
        title="No cost data yet"
        description="Quota snapshots are written on first action of the day. Run a workflow or an agent action to start populating this view."
      />
    )
  }

  const limitText =
    data.spending_limit_credits == null || data.spending_limit_credits < 0
      ? 'No spending cap'
      : `Cap ${formatCredits(data.spending_limit_credits)} credits/day`

  const remaining =
    data.spending_limit_credits != null && data.spending_limit_credits >= 0
      ? Math.max(0, data.spending_limit_credits - data.today_credits)
      : null

  const peakDay = [...data.daily].sort(
    (a, b) => b.credits_spent - a.credits_spent
  )[0]

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm dark:border-amber-500/20 dark:from-[#1d160d] dark:via-[#101010] dark:to-[#180d08]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
          Cost monitor
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          Spending and quota
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
          Daily quota counters from `agents.quota_snapshots` plus the
          configured `spending_limit_credits` policy. Numbers refresh as runs
          complete and the policy ceiling is enforced server-side.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Today</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            {formatCredits(data.today_credits)}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            credits · {limitText}
          </p>
          {remaining != null && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              {formatCredits(remaining)} remaining today
            </p>
          )}
        </div>
        <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">7 days</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            {formatCredits(data.seven_day_credits)}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">credits · trailing window</p>
        </div>
        <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">30 days</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            {formatCredits(data.thirty_day_credits)}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">credits · trailing window</p>
        </div>
        <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Peak day</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            {peakDay ? formatCredits(peakDay.credits_spent) : '—'}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {peakDay ? new Date(peakDay.period_date).toLocaleDateString() : 'no recorded spend'}
          </p>
        </div>
      </div>

      {data.daily.length > 0 ? (
        <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Daily breakdown</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Last {data.daily.length} day(s) of recorded usage.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Credits</th>
                  <th className="px-3 py-2 font-semibold">Battles</th>
                  <th className="px-3 py-2 font-semibold">Votes</th>
                </tr>
              </thead>
              <tbody>
                {data.daily.map((row) => (
                  <tr key={row.period_date} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                      {new Date(row.period_date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                      {formatCredits(row.credits_spent)}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                      {formatCredits(row.battles_used)}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                      {formatCredits(row.votes_used)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyPanel
          icon={<Sparkles size={22} />}
          title="No usage in the last 30 days"
          description="Quota snapshots are written on first action of the day. Run a workflow or an agent action to start populating this view."
        />
      )}
    </section>
  )
}
