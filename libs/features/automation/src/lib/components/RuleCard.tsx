import React, { useState } from 'react'
import { Trash2, Webhook, Workflow as WorkflowIcon, Bell } from 'lucide-react'
import { Badge, Button } from '@lenserfight/ui/components'
import { ConfirmModal } from '@lenserfight/ui/modals'

import type { TriggerRuleRecord, RuleDispatchSummary } from '../types'
import { useToggleRule } from '../hooks/mutations/useToggleRule'
import { useDeleteRule } from '../hooks/mutations/useDeleteRule'

interface RuleCardProps {
  rule: TriggerRuleRecord
  summary?: RuleDispatchSummary
}

const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
  { unit: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
  { unit: 'week', ms: 1000 * 60 * 60 * 24 * 7 },
  { unit: 'day', ms: 1000 * 60 * 60 * 24 },
  { unit: 'hour', ms: 1000 * 60 * 60 },
  { unit: 'minute', ms: 1000 * 60 },
  { unit: 'second', ms: 1000 },
]

function formatRelative(timestamp: string | null): string {
  if (!timestamp) return 'Never'
  try {
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
    const diff = new Date(timestamp).getTime() - Date.now()
    const abs = Math.abs(diff)
    for (const { unit, ms } of RELATIVE_UNITS) {
      if (abs >= ms || unit === 'second') {
        return rtf.format(Math.round(diff / ms), unit)
      }
    }
    return rtf.format(0, 'second')
  } catch {
    return new Date(timestamp).toLocaleString()
  }
}

function ActionTarget({ rule }: { rule: TriggerRuleRecord }) {
  const cfg = rule.action_config ?? {}

  if (rule.action_kind === 'webhook') {
    const url = typeof cfg.url === 'string' ? cfg.url : ''
    const display = url.length > 48 ? `${url.slice(0, 48)}…` : url || '(no url configured)'
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-greyscale-500 dark:text-greyscale-400">
        <Webhook size={14} aria-hidden="true" />
        <span className="truncate" title={url}>Webhook → {display}</span>
      </span>
    )
  }

  if (rule.action_kind === 'dispatch_workflow') {
    const workflowId = typeof cfg.workflow_id === 'string' ? cfg.workflow_id : ''
    const prefix = workflowId ? workflowId.slice(0, 8) : '(unset)'
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-greyscale-500 dark:text-greyscale-400">
        <WorkflowIcon size={14} aria-hidden="true" />
        <span title={workflowId}>Workflow → {prefix}</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-greyscale-500 dark:text-greyscale-400">
      <Bell size={14} aria-hidden="true" />
      <span>Notify</span>
    </span>
  )
}

function SuccessRate({ summary }: { summary?: RuleDispatchSummary }) {
  const dispatched = summary?.dispatched_count ?? 0
  const failed = summary?.failed_count ?? 0
  const denom = dispatched + failed

  if (denom === 0) {
    return (
      <span className="text-xs text-greyscale-400">No fires in 30d</span>
    )
  }

  const pct = Math.round((dispatched / denom) * 100)
  const barColor =
    pct >= 95 ? 'bg-status-green' : pct >= 80 ? 'bg-primary-yellow-500' : 'bg-status-red'

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div
        className="h-1.5 w-20 rounded-full bg-greyscale-200 dark:bg-greyscale-800 overflow-hidden"
        role="progressbar"
        aria-label="Dispatch success rate over the last 30 days"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-greyscale-600 dark:text-greyscale-300 tabular-nums">
        {pct}%
      </span>
      <span className="text-xs text-greyscale-400">
        ({dispatched}/{denom})
      </span>
    </div>
  )
}

export function RuleCard({ rule, summary }: RuleCardProps) {
  const toggleRule = useToggleRule()
  const deleteRule = useDeleteRule()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const lastFired = formatRelative(summary?.last_attempted_at ?? null)
  const isToggling = toggleRule.isPending
  const isDeleting = deleteRule.isPending

  return (
    <article
      className={`rounded-2xl border border-surface-border bg-card p-5 transition-all ${
        rule.is_active ? '' : 'opacity-70'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">
              {rule.name}
            </h2>
            <Badge color={rule.is_active ? 'green' : 'gray'} size="sm">
              {rule.is_active ? 'Active' : 'Disabled'}
            </Badge>
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <Badge color="blue" variant="outline" size="sm">
              {rule.match_event_type}
            </Badge>
            <ActionTarget rule={rule} />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="inline-flex items-center cursor-pointer">
            <span className="sr-only">
              {rule.is_active ? 'Disable rule' : 'Enable rule'} {rule.name}
            </span>
            <input
              type="checkbox"
              className="sr-only peer"
              checked={rule.is_active}
              disabled={isToggling}
              onChange={(e) =>
                toggleRule.mutate({ ruleId: rule.id, isActive: e.target.checked })
              }
            />
            <span
              aria-hidden="true"
              className="relative h-5 w-9 rounded-full bg-greyscale-300 dark:bg-greyscale-700 peer-checked:bg-status-green transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4"
            />
          </label>

          <Button
            variant="ghost"
            size="sm"
            aria-label={`Delete rule ${rule.name}`}
            onClick={() => setConfirmOpen(true)}
            disabled={isDeleting}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          <span className="text-greyscale-400">Last fired</span>
          <span className="font-medium text-greyscale-700 dark:text-greyscale-300">
            {lastFired}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-greyscale-400">Success (30d)</span>
          <SuccessRate summary={summary} />
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          deleteRule.mutate(rule.id, {
            onSettled: () => setConfirmOpen(false),
          })
        }}
        title="Delete automation rule?"
        message={`This will permanently delete "${rule.name}". Future events matching ${rule.match_event_type} will not trigger this action.`}
        confirmLabel="Delete rule"
        isLoading={isDeleting}
      />
    </article>
  )
}
