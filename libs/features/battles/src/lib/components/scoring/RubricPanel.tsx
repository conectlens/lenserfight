import { Badge, Card } from '@lenserfight/ui/components'
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
          return (
            <div key={c.id} className="rounded-2xl border border-surface-border bg-surface-raised p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_140px] md:items-center">
                <div className="space-y-1">
                  <p className="truncate text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">{c.name}</p>
                  {c.description && (
                    <p className="text-xs leading-6 text-greyscale-500 dark:text-greyscale-400">
                      {c.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-surface-border bg-surface-base px-3 py-2 text-xs">
                  <span className="text-greyscale-500">A</span>
                  <span title={entryA?.explanation}>{RESULT_ICON[entryA?.result ?? 'skipped']}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-surface-border bg-surface-base px-3 py-2 text-xs">
                  <span className="text-greyscale-500">B</span>
                  <span title={entryB?.explanation}>{RESULT_ICON[entryB?.result ?? 'skipped']}</span>
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
