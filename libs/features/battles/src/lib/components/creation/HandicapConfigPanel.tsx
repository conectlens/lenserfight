import { Badge, Button, HelpButton, Tooltip } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Info } from 'lucide-react'
import React from 'react'

import type { AIHandicapConfig } from '../../types/battle.types'

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
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
            AI handicap settings
          </label>
          <Tooltip
            content="AI models respond deterministically faster than humans. These settings level the playing field by adding artificial constraints to the AI contender. Recommended for Human vs AI: 2 s injected delay + 5 min time budget."
            position="right"
            contentClassName="whitespace-normal w-72 text-[11px]"
          >
            <Info size={13} className="text-greyscale-400 hover:text-greyscale-600 cursor-default" />
          </Tooltip>
          <HelpButton path="/how-to/battles/ai-handicap" label="About AI handicap" />
        </div>
        <Badge color="yellow" variant="outline">
          Human vs AI fairness
        </Badge>
      </div>

      {/* Injected delay */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-greyscale-700 dark:text-greyscale-300">
              Injected delay (ms)
            </span>
            <Tooltip
              content="Adds an artificial pause before the AI contender can start responding. Use this to simulate human reaction time. 2 000 ms (2 s) is the recommended starting point for Human vs AI battles."
              position="right"
              contentClassName="whitespace-normal w-64 text-[11px]"
            >
              <Info size={12} className="text-greyscale-400 hover:text-greyscale-600 cursor-default" />
            </Tooltip>
          </div>
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
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-greyscale-700 dark:text-greyscale-300">
              Time budget
            </span>
            <Tooltip
              content="Sets a hard wall-clock limit for the AI contender's total response time. Once the budget is exhausted the AI's output is cut off. 5 min is the recommended cap for Human vs AI battles — it mirrors a realistic human writing session."
              position="right"
              contentClassName="whitespace-normal w-64 text-[11px]"
            >
              <Info size={12} className="text-greyscale-400 hover:text-greyscale-600 cursor-default" />
            </Tooltip>
          </div>
          <span className="text-xs text-greyscale-500">
            {value.time_budget_ms == null
              ? 'No limit'
              : `${Math.round((value.time_budget_ms ?? 0) / 60000)} min`}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[null, 60000, 180000, 300000, 600000].map((ms) => {
            const label = ms == null ? 'None' : ms < 60000 ? `${ms / 1000}s` : `${ms / 60000} min`
            const isActive = value.time_budget_ms === ms
            return (
              <Button
                key={String(ms)}
                type="button"
                variant={isActive ? 'dark' : 'secondary'}
                size="sm"
                onClick={() => update({ time_budget_ms: ms })}
                className="!rounded-full !text-xs !px-3 !py-1.5"
              >
                {label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Context window cap */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-greyscale-700 dark:text-greyscale-300">
            Max context tokens
          </span>
          <Tooltip
            content="Caps the number of tokens the AI contender can hold in context during its response. A lower cap forces the AI to work with less information, narrowing the gap with human short-term memory. 'Unlimited' lets the model use its full context window."
            position="right"
            contentClassName="whitespace-normal w-64 text-[11px]"
          >
            <Info size={12} className="text-greyscale-400 hover:text-greyscale-600 cursor-default" />
          </Tooltip>
        </div>
        <SelectField
          label=""
          value={String(value.max_context_tokens ?? 'null')}
          onChange={(val) => update({ max_context_tokens: val === 'null' ? null : Number(val) })}
          options={CONTEXT_TOKEN_OPTIONS.map((o) => ({
            value: String(o.value ?? 'null'),
            label: o.label,
          }))}
        />
      </div>
    </div>
  )
}
