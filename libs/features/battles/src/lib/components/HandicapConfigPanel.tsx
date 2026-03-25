import { Badge } from '@lenserfight/ui/components'
import { Info } from 'lucide-react'
import React from 'react'

import type { AIHandicapConfig } from '../types/battle.types'

interface HandicapConfigPanelProps {
  value: AIHandicapConfig
  onChange: (cfg: AIHandicapConfig) => void
}

const CONTEXT_TOKEN_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Unlimited', value: null },
  { label: '512 tokens', value: 512 },
  { label: '1 024 tokens', value: 1024 },
  { label: '2 048 tokens', value: 2048 },
  { label: '4 096 tokens', value: 4096 },
]

const MODEL_TIER_OPTIONS: { label: string; value: 'free' | 'paid' | 'enterprise' | null }[] = [
  { label: 'Any tier', value: null },
  { label: 'Free tier only', value: 'free' },
  { label: 'Paid tier', value: 'paid' },
]

export function HandicapConfigPanel({ value, onChange }: HandicapConfigPanelProps) {
  const update = (patch: Partial<AIHandicapConfig>) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
          AI handicap settings
        </label>
        <Badge color="yellow" variant="outline">
          Human vs AI fairness
        </Badge>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100 flex items-start gap-2">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>
          AI models are deterministically faster than humans. These settings level the playing field.
          Recommended for Human vs AI: 2 s injected delay + 5 min time budget.
        </span>
      </div>

      {/* Injected delay */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-greyscale-700 dark:text-greyscale-300">
            Injected delay (ms)
          </span>
          <span className="text-xs text-greyscale-500">{value.injected_delay_ms ?? 0} ms</span>
        </div>
        <input
          type="range"
          min={0}
          max={10000}
          step={500}
          value={value.injected_delay_ms ?? 0}
          onChange={(e) => update({ injected_delay_ms: Number(e.target.value) })}
          className="w-full accent-greyscale-900 dark:accent-greyscale-0"
        />
        <div className="flex justify-between text-xs text-greyscale-400">
          <span>0 ms (instant)</span>
          <span>10 000 ms (10 s)</span>
        </div>
      </div>

      {/* Time budget */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-greyscale-700 dark:text-greyscale-300">
            Time budget
          </span>
          <span className="text-xs text-greyscale-500">
            {value.time_budget_ms == null
              ? 'No limit'
              : `${Math.round((value.time_budget_ms ?? 0) / 60000)} min`}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[null, 60000, 180000, 300000, 600000].map((ms) => {
            const label = ms == null ? 'None' : ms < 60000 ? `${ms / 1000}s` : `${ms / 60000} min`
            return (
              <button
                key={String(ms)}
                type="button"
                onClick={() => update({ time_budget_ms: ms })}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  value.time_budget_ms === ms
                    ? 'border-greyscale-900 bg-greyscale-900 text-greyscale-0 dark:border-greyscale-0 dark:bg-greyscale-0 dark:text-greyscale-900'
                    : 'border-surface-border text-greyscale-600 hover:border-status-blue dark:text-greyscale-400'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Context window cap */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-greyscale-700 dark:text-greyscale-300">
          Max context tokens
        </span>
        <select
          value={String(value.max_context_tokens ?? 'null')}
          onChange={(e) => update({ max_context_tokens: e.target.value === 'null' ? null : Number(e.target.value) })}
          className="w-full rounded-2xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-greyscale-900 outline-none dark:text-greyscale-50"
        >
          {CONTEXT_TOKEN_OPTIONS.map((o) => (
            <option key={String(o.value)} value={String(o.value ?? 'null')}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Model tier */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-greyscale-700 dark:text-greyscale-300">
          Allowed model tier
        </span>
        <div className="flex gap-2 flex-wrap">
          {MODEL_TIER_OPTIONS.map((t) => (
            <button
              key={String(t.value)}
              type="button"
              onClick={() => update({ allowed_model_tier: t.value })}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                value.allowed_model_tier === t.value
                  ? 'border-greyscale-900 bg-greyscale-900 text-greyscale-0 dark:border-greyscale-0 dark:bg-greyscale-0 dark:text-greyscale-900'
                  : 'border-surface-border text-greyscale-600 hover:border-status-blue dark:text-greyscale-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
