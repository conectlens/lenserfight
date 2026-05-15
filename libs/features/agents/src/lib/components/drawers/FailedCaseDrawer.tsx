import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { EvaluationCaseResultRow, EvaluationRunRecord } from '@lenserfight/types'
import { Drawer } from '@lenserfight/ui/overlays'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import React, { useState } from 'react'

import { DrawerDocsLink } from './DrawerDocsLink'
import { Button } from '@lenserfight/ui/components'


interface Props {
  open: boolean
  onClose: () => void
  run: EvaluationRunRecord | null
  aiLenserId: string
}

function isFailedCase(c: EvaluationCaseResultRow): boolean {
  if (c.passed === false) return true
  if (c.passed === null && c.case_score !== null && c.case_score < 1) return true
  return false
}

const JsonBlock: React.FC<{ label: string; value: unknown }> = ({ label, value }) => {
  const [expanded, setExpanded] = useState(false)
  const text = JSON.stringify(value, null, 2)
  const preview = text.slice(0, 80) + (text.length > 80 ? '…' : '')
  return (
    <div className="mt-2">
      <Button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      >
        {label} {expanded ? '▲' : '▼'}
      </Button>
      <pre className="overflow-x-auto rounded-xl border border-gray-100 bg-gray-50 p-2 font-mono text-[11px] text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        {expanded ? text : preview}
      </pre>
    </div>
  )
}

const FailedCaseCard: React.FC<{ c: EvaluationCaseResultRow }> = ({ c }) => (
  <div className="rounded-xl border border-red-100 bg-red-50/30 p-3 dark:border-red-500/20 dark:bg-red-500/5">
    <div className="flex items-center gap-2">
      <AlertTriangle size={13} className="shrink-0 text-red-500" />
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
        Case <span className="font-mono">{c.case_id.slice(0, 8)}</span>
      </span>
      <span className="ml-auto rounded-full border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:border-red-500/30 dark:text-red-400">
        score {c.case_score?.toFixed(2) ?? '—'}
      </span>
    </div>
    {c.case_error && (
      <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        {c.case_error}
      </p>
    )}
    <JsonBlock label="Input" value={c.input} />
    {c.expected !== null && <JsonBlock label="Expected" value={c.expected} />}
    {c.case_output !== null && <JsonBlock label="Output" value={c.case_output} />}
  </div>
)

export const FailedCaseDrawer: React.FC<Props> = ({ open, onClose, run }) => {
  const results = useQuery<EvaluationCaseResultRow[]>({
    queryKey: ['evalResults', run?.id ?? ''],
    queryFn: () => agentWorkspaceService.getEvaluationResults(run!.id),
    enabled: open && !!run,
    staleTime: 30_000,
  })

  const failed = (results.data ?? []).filter(isFailedCase)

  return (
    <Drawer open={open} onClose={onClose} side="right" width="w-[600px]" title="Failed cases">
      <DrawerDocsLink
        path="/how-to/agents/workspace/drawers/failed-case"
        tip="Read-only side-by-side diff for one failing case. Expected vs actual; click 'Run trace' to inspect tool calls and tokens consumed."
      />
      {results.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
            />
          ))}
        </div>
      ) : failed.length === 0 ? (
        <p className="rounded-xl border border-green-100 bg-green-50 px-4 py-6 text-center text-sm font-semibold text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
          All cases passed.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {failed.length} of {results.data?.length ?? 0} cases failed
          </p>
          {failed.map((c) => (
            <FailedCaseCard key={c.case_id} c={c} />
          ))}
        </div>
      )}
    </Drawer>
  )
}
