import { Badge, Button, EmptyState, PageHeader } from '@lenserfight/ui/components'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import React, { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVoteAnomalies, useResolveVoteAnomaly } from '../hooks/query/useVoteAnomalies'

type StatusFilter = 'pending' | 'resolved' | 'all'

const ANOMALY_TYPE_LABELS: Record<string, string> = {
  new_account:              'New account',
  zero_battles_participated:'No prior battles',
  high_concentration:       'Vote concentration',
  rapid_succession:         'Rapid succession',
}

function scoreBadgeColor(score: number): 'red' | 'yellow' | 'green' {
  if (score >= 0.75) return 'red'
  if (score >= 0.5)  return 'yellow'
  return 'green'
}

export function VoteAnomaliesPage() {
  const [status, setStatus] = useState<StatusFilter>('pending')
  const { data, isLoading, refetch } = useVoteAnomalies(status)
  const { mutate: resolve, isPending: isResolving } = useResolveVoteAnomaly()

  const handleResolve = useCallback((id: string) => {
    resolve(id, { onSuccess: () => refetch() })
  }, [resolve, refetch])

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: 'pending',  label: 'Pending' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'all',      label: 'All' },
  ]

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <PageHeader
          title="Vote Anomalies"
          description="Suspected vote manipulation signals detected in real-time."
          action={<AlertTriangle className="h-5 w-5 text-surface-text-muted" />}
        />

        {/* Filter tabs */}
        <div className="flex gap-2 border-b border-surface-border pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatus(tab.key)}
              className={[
                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                status === tab.key
                  ? 'bg-accent-primary text-white'
                  : 'text-surface-text-muted hover:text-surface-text',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="text-center py-12 text-surface-text-muted text-sm">Loading anomalies…</div>
        )}

        {!isLoading && (!data || data.length === 0) && (
          <EmptyState
            icon={CheckCircle}
            title="No anomalies"
            description={
              status === 'pending'
                ? 'No pending vote anomalies. The queue is clean.'
                : 'Nothing here yet.'
            }
          />
        )}

        {!isLoading && data && data.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-raised border-b border-surface-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-surface-text-muted">Battle</th>
                  <th className="px-4 py-3 text-left font-medium text-surface-text-muted">Voter</th>
                  <th className="px-4 py-3 text-left font-medium text-surface-text-muted">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-surface-text-muted">Score</th>
                  <th className="px-4 py-3 text-left font-medium text-surface-text-muted">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-surface-text-muted">Detected</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data.map((row) => (
                  <tr key={row.id} className="bg-surface hover:bg-surface-raised transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        to={`/battles/${row.battle_id}`}
                        className="text-accent-primary hover:underline font-mono text-xs"
                      >
                        {row.battle_id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/lenser/${row.voter_lenser_id}`}
                        className="text-accent-primary hover:underline font-mono text-xs"
                      >
                        {row.voter_lenser_id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {ANOMALY_TYPE_LABELS[row.anomaly_type] ?? row.anomaly_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={scoreBadgeColor(row.score)} variant="outline">
                        {(row.score * 100).toFixed(0)}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {row.resolved_at ? (
                        <Badge color="green" variant="outline" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Resolved
                        </Badge>
                      ) : (
                        <Badge color="yellow" variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Pending
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-surface-text-muted text-xs">
                      {new Date(row.detected_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {!row.resolved_at && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleResolve(row.id)}
                          disabled={isResolving}
                        >
                          Resolve
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
