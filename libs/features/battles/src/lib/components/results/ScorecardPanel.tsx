import React, { useState } from 'react'
import type { BattleScorecardData } from '../../hooks/query/useBattleScorecard'
import type { Contender } from '../../types/battle.types'

interface ScorecardPanelProps {
  scorecardData: BattleScorecardData
  contenders: Contender[]
}

const RESULT_CONFIG = {
  pass: { label: 'Pass', colorClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', icon: '✓' },
  fail: { label: 'Fail', colorClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: '✗' },
  partial: { label: 'Partial', colorClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: '~' },
  skipped: { label: 'Skipped', colorClass: 'bg-surface-interactive text-surface-text-muted', icon: '—' },
} as const

export function ScorecardPanel({ scorecardData, contenders }: ScorecardPanelProps) {
  const { scorecards, criteria } = scorecardData
  const [expanded, setExpanded] = useState<string | null>(null)

  if (scorecards.length === 0 || criteria.length === 0) return null

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-text-disabled mb-3">
        AI Judge Scorecard
      </p>

      <div className="space-y-3">
        {criteria.map((criterion) => {
          const cardsForCriterion = scorecards.filter((s) => s.rubric_criterion_id === criterion.id)
          const isOpen = expanded === criterion.id

          return (
            <div key={criterion.id} className="rounded-lg border border-surface-border-subtle overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : criterion.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-surface-base hover:bg-surface-interactive transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-surface-text truncate">{criterion.title}</span>
                  {criterion.weight !== 1 && (
                    <span className="flex-shrink-0 rounded px-1 py-0.5 bg-surface-interactive text-[10px] font-bold text-surface-text-muted">
                      ×{criterion.weight}
                    </span>
                  )}
                </div>
                <span className="ml-2 text-surface-text-muted flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 space-y-2 bg-surface-base border-t border-surface-border-subtle">
                  {criterion.description && (
                    <p className="text-xs text-surface-text-muted leading-relaxed pt-2">{criterion.description}</p>
                  )}
                  {cardsForCriterion.map((card) => {
                    const contender = contenders.find((c) => c.id === card.contender_id)
                    const cfg = RESULT_CONFIG[card.result] ?? RESULT_CONFIG.skipped

                    return (
                      <div key={card.id} className="flex items-start gap-2 pt-1.5">
                        <div className="h-5 w-5 flex-shrink-0 rounded-md bg-primary-yellow-500 flex items-center justify-center text-[10px] font-black text-dark-900">
                          {contender?.slot ?? '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-medium text-surface-text truncate">
                              {contender?.display_name ?? '—'}
                            </span>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.colorClass}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </div>
                          {card.explanation && (
                            <p className="text-xs text-surface-text-muted leading-relaxed">{card.explanation}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {cardsForCriterion.length === 0 && (
                    <p className="text-xs text-surface-text-muted pt-2">No scores recorded for this criterion.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
