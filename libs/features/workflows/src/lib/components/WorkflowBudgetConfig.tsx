import { Coins } from 'lucide-react'
import React from 'react'

interface WorkflowBudgetConfigProps {
  budgetCredits: number | null
  spentCredits?: number
  onBudgetChange: (budget: number | null) => void
  disabled?: boolean
}

export function WorkflowBudgetConfig({
  budgetCredits,
  spentCredits = 0,
  onBudgetChange,
  disabled = false,
}: WorkflowBudgetConfigProps) {
  const percentage = budgetCredits ? Math.min((spentCredits / budgetCredits) * 100, 100) : 0
  const isOverBudget = budgetCredits !== null && spentCredits > budgetCredits

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-1.5 text-xs font-medium text-greyscale-600 dark:text-greyscale-300">
        <Coins size={12} />
        Budget Limit (credits)
      </label>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          placeholder="Unlimited"
          value={budgetCredits ?? ''}
          onChange={(e) => {
            const val = e.target.value
            onBudgetChange(val === '' ? null : Math.max(0, parseInt(val, 10)))
          }}
          disabled={disabled}
          className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-1.5 text-xs text-greyscale-900 dark:text-greyscale-100 placeholder:text-greyscale-400 disabled:opacity-50"
        />
        {budgetCredits !== null && (
          <span className="text-[10px] text-greyscale-400 whitespace-nowrap">
            {spentCredits} / {budgetCredits}
          </span>
        )}
      </div>

      {/* Budget progress bar */}
      {budgetCredits !== null && (
        <div className="h-1.5 w-full rounded-full bg-surface-raised overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isOverBudget
                ? 'bg-red-500'
                : percentage > 80
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
