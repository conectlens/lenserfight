import { Dialog } from '@lenserfight/ui/overlays'
import type { ApprovalDecision, ApprovalRequestView } from '@lenserfight/types'
import React, { useEffect, useMemo, useState } from 'react'

interface ApprovalDecisionDialogProps {
  request: ApprovalRequestView | null
  decision: ApprovalDecision | null
  isSubmitting: boolean
  onSubmit: (input: {
    request_id: string
    decision: ApprovalDecision
    reason: string
    modifications?: Record<string, unknown>
  }) => void
  onClose: () => void
}

/**
 * Modal that captures the human owner's decision for a pending approval
 * request. Reason is always optional; modifications is required only when
 * `decision === 'modified'`. The modifications JSON is parsed client-side
 * before submit so the caller never sees malformed payloads.
 */
export const ApprovalDecisionDialog: React.FC<ApprovalDecisionDialogProps> = ({
  request,
  decision,
  isSubmitting,
  onSubmit,
  onClose,
}) => {
  const [reason, setReason] = useState('')
  const [modifications, setModifications] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  useEffect(() => {
    if (!request || !decision) return
    setReason('')
    setModifications(
      decision === 'modified'
        ? JSON.stringify(request.metadata?.decision_modifications ?? {}, null, 2)
        : ''
    )
    setParseError(null)
  }, [request, decision])

  const titles = useMemo<Record<ApprovalDecision, { title: string; cta: string }>>(
    () => ({
      approved: { title: 'Approve request', cta: 'Approve' },
      rejected: { title: 'Reject request', cta: 'Reject' },
      modified: { title: 'Modify and approve', cta: 'Apply and approve' },
    }),
    []
  )

  if (!request || !decision) return null

  const meta = titles[decision]

  const handleSubmit = () => {
    let parsed: Record<string, unknown> | undefined
    if (decision === 'modified') {
      const trimmed = modifications.trim()
      if (!trimmed) {
        setParseError('Modifications must be a JSON object.')
        return
      }
      try {
        const value = JSON.parse(trimmed)
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          setParseError('Modifications must be a JSON object (not array or primitive).')
          return
        }
        parsed = value as Record<string, unknown>
      } catch (err) {
        setParseError(`Invalid JSON: ${(err as Error).message}`)
        return
      }
    }
    onSubmit({
      request_id: request.request_id,
      decision,
      reason: reason.trim(),
      modifications: parsed,
    })
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={meta.title}
      description={`Request ${request.request_id.slice(0, 8)}…${request.workflow_title ? ` · ${request.workflow_title}` : ''}`}
      maxWidth="max-w-xl"
      dismissOnBackdrop={!isSubmitting}
    >
      <div className="space-y-4 p-6">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="font-semibold">Gate</span>
            <span>{request.gate_kind ?? '—'}</span>
            <span className="font-semibold">Requested action</span>
            <span>{request.requested_action ?? '—'}</span>
            <span className="font-semibold">Run status</span>
            <span>{request.run_status}</span>
            <span className="font-semibold">Assignee</span>
            <span>{request.assignee_kind ?? '—'}</span>
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Decision reason (optional)
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="Why are you making this decision?"
            className="mt-2 w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </label>

        {decision === 'modified' && (
          <label className="block">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Modifications (JSON object) <span className="text-red-600">*</span>
            </span>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Stored on `team_runs.metadata.decision_modifications`. The engine
              merges it into the run's runtime input on resume. No other keys
              are honored.
            </p>
            <textarea
              value={modifications}
              onChange={(event) => {
                setModifications(event.target.value)
                if (parseError) setParseError(null)
              }}
              rows={8}
              placeholder='{ "max_tokens": 2048 }'
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white p-3 font-mono text-xs text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-amber-100"
            />
            {parseError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{parseError}</p>
            )}
          </label>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${decision === 'rejected'
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-amber-600 hover:bg-amber-500'
              }`}
          >
            {isSubmitting ? 'Submitting…' : meta.cta}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
