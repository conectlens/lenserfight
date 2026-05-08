import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  SEOHead,
  Tooltip,
} from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Modal } from '@lenserfight/ui/modals'
import { Bot, ShieldAlert, User } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useOverrideModerationDecision } from '../hooks/mutations/useOverrideModerationDecision'
import {
  useModerationDecisions,
  type ModerationStatusFilter,
} from '../hooks/query/useModerationDecisions'

import type {
  ModerationDecisionRecord,
  ModerationDecisionType,
} from '@lenserfight/data/repositories'

const STATUS_OPTIONS: { value: ModerationStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'removed', label: 'Removed' },
  { value: 'restored', label: 'Restored' },
  { value: 'warned', label: 'Warned' },
]

const OVERRIDE_OPTIONS: { value: ModerationDecisionType; label: string }[] = [
  { value: 'approved', label: 'Approve' },
  { value: 'rejected', label: 'Reject' },
  { value: 'removed', label: 'Remove' },
  { value: 'restored', label: 'Restore' },
  { value: 'warned', label: 'Warn' },
  { value: 'flagged', label: 'Flag' },
]

const LIMIT_OPTIONS = [
  { value: '25', label: '25 per page' },
  { value: '50', label: '50 per page' },
  { value: '100', label: '100 per page' },
]

const DEFAULT_STATUS: ModerationStatusFilter = 'flagged'
const DEFAULT_LIMIT = 50
const REASON_MIN_LENGTH = 8
const REASON_MAX_LENGTH = 500

const decisionBadgeColor: Record<
  ModerationDecisionType,
  'red' | 'green' | 'yellow' | 'gray' | 'blue' | 'purple'
> = {
  flagged: 'red',
  approved: 'green',
  rejected: 'yellow',
  removed: 'gray',
  restored: 'blue',
  warned: 'purple',
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffSec = Math.max(1, Math.round((now - then) / 1000))
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.round(diffH / 24)
  if (diffD < 30) return `${diffD}d ago`
  return new Date(iso).toLocaleDateString()
}

function truncate(text: string | null, max: number): string {
  if (!text) return '—'
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

function DecisionBadge({ type }: { type: ModerationDecisionType }) {
  return (
    <Badge color={decisionBadgeColor[type]} size="sm" className="capitalize">
      {type}
    </Badge>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-b border-surface-border">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-4 w-full max-w-[120px] rounded bg-surface-raised animate-pulse" />
        </td>
      ))}
    </tr>
  )
}

interface OverrideDialogState {
  decision: ModerationDecisionRecord
  newType: ModerationDecisionType
  reason: string
}

export function AdminBattlesPanelPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const status = (searchParams.get('status') as ModerationStatusFilter | null) ?? DEFAULT_STATUS
  const limitParam = searchParams.get('limit')
  const limit = limitParam ? Number(limitParam) : DEFAULT_LIMIT

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

  const { data, isLoading, isError, error, refetch } = useModerationDecisions(status, limit)
  const overrideMutation = useOverrideModerationDecision()

  const [dialog, setDialog] = useState<OverrideDialogState | null>(null)

  const reasonError = useMemo(() => {
    if (!dialog) return null
    const trimmed = dialog.reason.trim()
    if (trimmed.length === 0) return 'Reason is required.'
    if (trimmed.length < REASON_MIN_LENGTH) {
      return `Reason must be at least ${REASON_MIN_LENGTH} characters.`
    }
    if (trimmed.length > REASON_MAX_LENGTH) {
      return `Reason must be ${REASON_MAX_LENGTH} characters or fewer.`
    }
    return null
  }, [dialog])

  const handleConfirmOverride = () => {
    if (!dialog || reasonError) return
    overrideMutation.mutate(
      {
        decisionId: dialog.decision.decision_id,
        overrideDecisionType: dialog.newType,
        reason: dialog.reason.trim(),
      },
      {
        onSuccess: () => setDialog(null),
      }
    )
  }

  const decisions = data ?? []

  return (
    <div>
      <SEOHead type="default" overrideTitle="Battle Moderation — LenserFight" />
      <PageHeader
        title="Battle Moderation"
        description="Review flagged moderation decisions and apply overrides."
      />

      <div className="sticky top-[56px] z-20 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur py-3 border-b border-gray-100/50 dark:border-gray-800/50 transition-all mb-6 -mx-2 sm:-mx-4 lg:-mx-8 px-2 sm:px-4 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <SelectField
            label="Status"
            value={status}
            onChange={(v) => setParam('status', v, DEFAULT_STATUS)}
            options={STATUS_OPTIONS}
            className="w-44"
          />
          <SelectField
            label="Limit"
            value={String(limit)}
            onChange={(v) => setParam('limit', v, String(DEFAULT_LIMIT))}
            options={LIMIT_OPTIONS}
            className="w-44"
          />
        </div>
      </div>

      {isError ? (
        <div
          role="alert"
          className="rounded-2xl border border-status-red/40 bg-status-red/5 dark:bg-status-red/10 p-6 flex flex-col sm:flex-row items-start gap-4"
        >
          <ShieldAlert size={20} className="text-status-red flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-greyscale-900 dark:text-greyscale-50">
              Couldn’t load moderation decisions.
            </p>
            <p className="mt-1 text-sm text-greyscale-500 dark:text-greyscale-400">
              {error?.message ?? 'An unexpected error occurred.'}
            </p>
            <div className="mt-3">
              <Button onClick={() => refetch()} className="w-auto">
                Retry
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-surface-border bg-surface-raised">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">
              Moderation decisions{' '}
              {status === 'all' ? 'across all statuses' : `with status ${status}`}.
            </caption>
            <thead className="bg-gray-50 dark:bg-gray-900/40 text-greyscale-500 dark:text-greyscale-400 uppercase text-xs tracking-wide">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">When</th>
                <th scope="col" className="px-3 py-2 font-semibold">Battle</th>
                <th scope="col" className="px-3 py-2 font-semibold">Decision</th>
                <th scope="col" className="px-3 py-2 font-semibold">AI?</th>
                <th scope="col" className="px-3 py-2 font-semibold">Confidence</th>
                <th scope="col" className="px-3 py-2 font-semibold">Reason</th>
                <th scope="col" className="px-3 py-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : decisions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      title="No moderation decisions match this filter."
                      description="Try selecting a different status."
                      className="border-0"
                    />
                  </td>
                </tr>
              ) : (
                <>
                  {decisions.map((d) => (
                    <tr
                      key={d.decision_id}
                      className="border-t border-surface-border hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                    >
                      <td className="px-3 py-3 whitespace-nowrap text-greyscale-600 dark:text-greyscale-400">
                        <Tooltip content={new Date(d.occurred_at).toLocaleString()}>
                          <span>{formatRelative(d.occurred_at)}</span>
                        </Tooltip>
                      </td>
                      <td className="px-3 py-3 max-w-[260px] truncate">
                        {d.battle_slug && d.battle_title ? (
                          <Link
                            to={`/battles/${d.battle_slug}`}
                            className="text-primary-yellow-600 dark:text-primary-yellow-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500 rounded-sm"
                          >
                            {d.battle_title}
                          </Link>
                        ) : (
                          <span className="text-greyscale-500 dark:text-greyscale-400">
                            {d.battle_title ?? d.target_entity_id.slice(0, 8) + '…'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <DecisionBadge type={d.decision_type} />
                      </td>
                      <td className="px-3 py-3">
                        {d.is_ai_moderated ? (
                          <Tooltip content="Decided by automated AI moderation">
                            <span
                              role="img"
                              aria-label="AI-moderated"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-yellow-500/15 text-primary-yellow-600 dark:text-primary-yellow-400"
                            >
                              <Bot size={14} aria-hidden="true" />
                            </span>
                          </Tooltip>
                        ) : (
                          <Tooltip content="Decided by a human moderator">
                            <span
                              role="img"
                              aria-label="Human-moderated"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-greyscale-200 text-greyscale-700 dark:bg-greyscale-800 dark:text-greyscale-300"
                            >
                              <User size={14} aria-hidden="true" />
                            </span>
                          </Tooltip>
                        )}
                      </td>
                      <td className="px-3 py-3 text-greyscale-600 dark:text-greyscale-400 tabular-nums">
                        {d.ai_confidence != null
                          ? `${Math.round(d.ai_confidence * 100)}%`
                          : '—'}
                      </td>
                      <td className="px-3 py-3 max-w-[320px] text-greyscale-600 dark:text-greyscale-300">
                        {d.reason ? (
                          <Tooltip content={d.reason}>
                            <span className="truncate inline-block max-w-full align-bottom">
                              {truncate(d.reason, 80)}
                            </span>
                          </Tooltip>
                        ) : (
                          <span className="text-greyscale-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setDialog({
                              decision: d,
                              newType:
                                d.decision_type === 'flagged' ? 'approved' : 'rejected',
                              reason: '',
                            })
                          }
                          className="w-auto"
                          aria-label={`Override decision for ${d.battle_title ?? 'entry'}`}
                        >
                          Override
                        </Button>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={!!dialog}
        onClose={() => (overrideMutation.isPending ? undefined : setDialog(null))}
        title="Override moderation decision"
        canClose={!overrideMutation.isPending}
      >
        {dialog && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              handleConfirmOverride()
            }}
          >
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-greyscale-500 dark:text-greyscale-400">Current:</span>
                <DecisionBadge type={dialog.decision.decision_type} />
              </div>
              {dialog.decision.battle_title && (
                <p className="text-greyscale-700 dark:text-greyscale-200 truncate">
                  {dialog.decision.battle_title}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="override-decision-type"
                className="block text-sm font-medium text-greyscale-700 dark:text-greyscale-300 mb-1"
              >
                New decision
              </label>
              <SelectField
                value={dialog.newType}
                onChange={(v) =>
                  setDialog((prev) =>
                    prev ? { ...prev, newType: v as ModerationDecisionType } : prev
                  )
                }
                options={OVERRIDE_OPTIONS}
                className="w-full"
              />
            </div>

            <div>
              <label
                htmlFor="override-reason"
                className="block text-sm font-medium text-greyscale-700 dark:text-greyscale-300 mb-1"
              >
                Reason
              </label>
              <textarea
                id="override-reason"
                aria-required="true"
                aria-invalid={!!reasonError}
                aria-describedby="override-reason-help"
                value={dialog.reason}
                onChange={(e) =>
                  setDialog((prev) => (prev ? { ...prev, reason: e.target.value } : prev))
                }
                maxLength={REASON_MAX_LENGTH}
                rows={4}
                className="w-full rounded-xl border border-surface-border bg-white dark:bg-gray-800 px-3 py-2 text-sm text-greyscale-900 dark:text-greyscale-100 placeholder:text-greyscale-400 focus:outline-none focus:ring-2 focus:ring-primary-yellow-500"
                placeholder="Explain why you're overriding this decision (min 8 characters)."
              />
              <div
                id="override-reason-help"
                className="mt-1 flex items-center justify-between text-xs"
              >
                <span
                  className={
                    reasonError
                      ? 'text-status-red'
                      : 'text-greyscale-500 dark:text-greyscale-400'
                  }
                >
                  {reasonError ?? 'This reason will be recorded on the audit trail.'}
                </span>
                <span className="text-greyscale-400 tabular-nums">
                  {dialog.reason.length}/{REASON_MAX_LENGTH}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDialog(null)}
                disabled={overrideMutation.isPending}
                className="w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={overrideMutation.isPending}
                disabled={!!reasonError || overrideMutation.isPending}
                className="w-auto"
              >
                {overrideMutation.isPending ? 'Applying…' : 'Confirm override'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
