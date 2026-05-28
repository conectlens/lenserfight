import React from 'react'
import { CheckCircle2, ShieldX } from 'lucide-react'
import { Button, EmptyState, PageHeader } from '@lenserfight/ui/components'
import { toast } from 'sonner'

import { useGatewayDaemons, type GatewayDaemonRecord } from '../hooks/useGatewayDaemons'

// Phase BB — owner-facing list of long-running gateway daemons with
// approve / revoke actions. Visual cue is a green/amber/red status dot based
// on heartbeat recency.

function statusDot(lastSeenAt: string | null, revokedAt: string | null): {
  className: string
  label: string
} {
  if (revokedAt) return { className: 'bg-red-500', label: 'revoked' }
  if (!lastSeenAt) return { className: 'bg-greyscale-500', label: 'no heartbeat' }
  const elapsed = Date.now() - new Date(lastSeenAt).getTime()
  if (elapsed < 5 * 60_000) return { className: 'bg-emerald-500', label: 'online' }
  if (elapsed < 30 * 60_000) return { className: 'bg-amber-500', label: 'stale' }
  return { className: 'bg-red-500', label: 'offline' }
}

function fmtRelative(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))}s ago`
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`
  return `${Math.round(diff / 86_400_000)}d ago`
}

function DaemonRow({
  daemon,
  onApprove,
  onRevoke,
  busy,
}: {
  daemon: GatewayDaemonRecord
  onApprove: (id: string) => Promise<void>
  onRevoke: (id: string) => Promise<void>
  busy: boolean
}) {
  const status = statusDot(daemon.lastSeenAt, daemon.revokedAt)
  const approved = Boolean(daemon.approvedAt) && !daemon.revokedAt

  const handleApprove = async () => {
    try {
      await onApprove(daemon.deviceId)
      toast.success('Daemon approved')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }
  const handleRevoke = async () => {
    if (!window.confirm(`Revoke daemon ${daemon.deviceId.slice(0, 8)}…? The daemon will receive kill_switch=true on its next heartbeat.`)) {
      return
    }
    try {
      await onRevoke(daemon.deviceId)
      toast.success('Daemon revoked')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <tr className="border-b border-surface-border last:border-b-0">
      <td className="px-3 py-3 font-mono text-xs">{daemon.deviceId.slice(0, 8)}</td>
      <td className="px-3 py-3 text-sm">{daemon.hostname ?? '—'}</td>
      <td className="px-3 py-3 text-sm text-greyscale-400">{daemon.daemonVersion ?? '—'}</td>
      <td className="px-3 py-3 text-sm">
        <span className="inline-flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${status.className}`} aria-label={status.label} />
          <span className="text-greyscale-300">{fmtRelative(daemon.lastSeenAt)}</span>
        </span>
      </td>
      <td className="px-3 py-3 text-sm text-greyscale-200">
        {(daemon.pendingCommands ?? 0) > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
            {daemon.pendingCommands} pending
          </span>
        ) : (
          <span className="text-greyscale-500">0</span>
        )}
      </td>
      <td className="px-3 py-3 text-sm">
        {approved ? (
          <span className="inline-flex items-center gap-1 text-emerald-500">
            <CheckCircle2 size={14} /> Approved
          </span>
        ) : daemon.revokedAt ? (
          <span className="inline-flex items-center gap-1 text-red-500">
            <ShieldX size={14} /> Revoked
          </span>
        ) : (
          <span className="text-amber-500">Pending</span>
        )}
      </td>
      <td className="px-3 py-3 text-right space-x-2">
        {!approved && !daemon.revokedAt && (
          <Button size="sm" onClick={handleApprove} disabled={busy}>
            Approve
          </Button>
        )}
        {!daemon.revokedAt && (
          <Button size="sm" variant="secondary" onClick={handleRevoke} disabled={busy}>
            Revoke
          </Button>
        )}
      </td>
    </tr>
  )
}

export const GatewayDaemonsPage: React.FC = () => {
  const { daemons, isLoading, approve, revoke, isApproving, isRevoking } = useGatewayDaemons()
  const busy = isApproving || isRevoking

  // Phase BE: summary cards across the top.
  const online = daemons.filter((d) => {
    if (d.revokedAt) return false
    if (!d.lastSeenAt) return false
    return Date.now() - new Date(d.lastSeenAt).getTime() < 5 * 60_000
  }).length
  const pendingTotal = daemons.reduce((sum, d) => sum + (d.pendingCommands ?? 0), 0)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <PageHeader
        title="Gateway Daemons"
        description="Long-running gateway daemons that report to your account. Approve a daemon to allow it to receive commands; revoke to trigger its kill-switch."
      />

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Total daemons" value={daemons.length} />
        <SummaryCard label="Online (≤ 5m)" value={online} highlight={online > 0} />
        <SummaryCard label="Pending commands" value={pendingTotal} />
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-surface-raised animate-pulse" />
            ))}
          </div>
        ) : daemons.length === 0 ? (
          <EmptyState
            title="No gateway daemons registered."
            description="Run `lf gateway serve` on a host you control. It will heartbeat into your account and appear here."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-surface-border bg-surface-base">
            <table className="w-full text-left">
              <thead className="text-xs uppercase tracking-wider text-greyscale-500">
                <tr className="border-b border-surface-border">
                  <th className="px-3 py-2 font-medium">Device</th>
                  <th className="px-3 py-2 font-medium">Host</th>
                  <th className="px-3 py-2 font-medium">Version</th>
                  <th className="px-3 py-2 font-medium">Last seen</th>
                  <th className="px-3 py-2 font-medium">Pending</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {daemons.map((d) => (
                  <DaemonRow
                    key={d.deviceId}
                    daemon={d}
                    onApprove={approve}
                    onRevoke={revoke}
                    busy={busy}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        highlight ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-surface-border bg-surface-base'
      }`}
    >
      <div className="text-xs uppercase tracking-wider text-greyscale-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-greyscale-100">{value}</div>
    </div>
  )
}

export default GatewayDaemonsPage
