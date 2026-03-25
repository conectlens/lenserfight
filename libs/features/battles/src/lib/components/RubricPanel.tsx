import React from 'react'

interface Criterion {
  id: string
  name: string
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
}

const RESULT_ICON: Record<string, string> = {
  pass: '✅',
  fail: '❌',
  partial: '🔶',
  skipped: '⬜',
}

export function RubricPanel({ criteria, scorecardA = [], scorecardB = [] }: RubricPanelProps) {
  if (criteria.length === 0) return null

  return (
    <div className="rounded-xl border border-[var(--cl-surface-border)] bg-[var(--cl-surface-base)] p-4">
      <p className="text-sm font-semibold text-[var(--cl-surface-text)] mb-3">AI Rubric Check</p>
      <div className="space-y-2">
        {criteria.map((c) => {
          const entryA = scorecardA.find((s) => s.rubricCriterionId === c.id)
          const entryB = scorecardB.find((s) => s.rubricCriterionId === c.id)
          return (
            <div key={c.id} className="grid grid-cols-[1fr_2rem_2rem] gap-2 items-center text-sm">
              <span className="text-[var(--cl-surface-text-muted)] truncate">{c.name}</span>
              <span className="text-center" title={entryA?.explanation}>
                {RESULT_ICON[entryA?.result ?? 'skipped']}
              </span>
              <span className="text-center" title={entryB?.explanation}>
                {RESULT_ICON[entryB?.result ?? 'skipped']}
              </span>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-[var(--cl-surface-text-disabled)] mt-3">
        AI rubric checks are additive signals — human votes determine the winner.
      </p>
    </div>
  )
}
