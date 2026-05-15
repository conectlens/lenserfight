import { Badge, Card } from '@lenserfight/ui/components'
import React from 'react'

import type { AiJudgeVerdictRecord } from '../../hooks/query/useAiJudgeVerdicts'

interface Criterion {
  id: string
  title: string
  description?: string
  weight: number
}

interface ScorecardEntry {
  rubricCriterionId: string
  result: 'pass' | 'fail' | 'partial' | 'skipped'
  explanation?: string
}

interface RubricPanelProps {
  criteria: Criterion[]
  scorecardA?: ScorecardEntry[]
  scorecardB?: ScorecardEntry[]
  verdictsA?: AiJudgeVerdictRecord[]
  verdictsB?: AiJudgeVerdictRecord[]
}

const RESULT_ICON: Record<string, string> = {
  pass: '✅',
  fail: '❌',
  partial: '🔶',
  skipped: '⬜',
}

function ScorePill({ score }: { score: number }) {
  return (
    <span className="ml-2 tabular-nums text-xs font-bold text-greyscale-700 dark:text-greyscale-300">
      {score.toFixed(1)}/10
    </span>
  )
}

function RationaleExpander({ rationale }: { rationale: string }) {
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-xs text-primary-500 hover:underline">Judge rationale</summary>
      <p className="mt-1 text-xs leading-5 text-greyscale-500 dark:text-greyscale-400">{rationale}</p>
    </details>
  )
}

export function RubricPanel({ criteria, scorecardA = [], scorecardB = [], verdictsA, verdictsB }: RubricPanelProps) {
  if (criteria.length === 0) return null

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">AI rubric check</p>
        <Badge color="yellow" variant="outline">
          Additive signal
        </Badge>
      </div>
      <div className="space-y-3">
        {criteria.map((c) => {
          const entryA = scorecardA.find((s) => s.rubricCriterionId === c.id)
          const entryB = scorecardB.find((s) => s.rubricCriterionId === c.id)
          const verdictA = verdictsA?.find((v) => v.criterion_id === c.id)
          const verdictB = verdictsB?.find((v) => v.criterion_id === c.id)
          return (
            <div key={c.id} className="rounded-2xl border border-surface-border bg-surface-raised p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_140px] md:items-start">
                <div className="space-y-1">
                  <p className="truncate text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">{c.title}</p>
                  {c.description && (
                    <p className="text-xs leading-6 text-greyscale-500 dark:text-greyscale-400">
                      {c.description}
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-surface-border bg-surface-base px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-greyscale-500">A</span>
                    <span className="flex items-center" title={entryA?.explanation}>
                      {RESULT_ICON[entryA?.result ?? 'skipped']}
                      {verdictA && <ScorePill score={verdictA.score} />}
                    </span>
                  </div>
                  {verdictA?.rationale && <RationaleExpander rationale={verdictA.rationale} />}
                </div>
                <div className="rounded-2xl border border-surface-border bg-surface-base px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-greyscale-500">B</span>
                    <span className="flex items-center" title={entryB?.explanation}>
                      {RESULT_ICON[entryB?.result ?? 'skipped']}
                      {verdictB && <ScorePill score={verdictB.score} />}
                    </span>
                  </div>
                  {verdictB?.rationale && <RationaleExpander rationale={verdictB.rationale} />}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs leading-6 text-greyscale-500 dark:text-greyscale-400">
        AI rubric checks are additive signals — human votes determine the winner.
      </p>
    </Card>
  )
}
