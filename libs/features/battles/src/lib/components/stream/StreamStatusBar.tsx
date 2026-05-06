/**
 * StreamStatusBar — per-contender metrics during live execution.
 * Shows state badge, token count, tokens/sec, and credit cost.
 */
import React from 'react'
import { Badge } from '@lenserfight/ui/components'
import { Cpu, Coins, Zap } from 'lucide-react'

import type { ContenderStreamSnapshot } from '../../types/battle-execution.types'

interface StreamStatusBarProps {
  snapshot: ContenderStreamSnapshot
}

const STATE_BADGE: Record<string, { label: string; color: 'gray' | 'green' | 'blue' | 'yellow' }> = {
  idle: { label: 'Idle', color: 'gray' },
  loading: { label: 'Loading', color: 'yellow' },
  streaming: { label: 'Streaming', color: 'blue' },
  complete: { label: 'Complete', color: 'green' },
  error: { label: 'Error', color: 'yellow' },
}

export const StreamStatusBar: React.FC<StreamStatusBarProps> = ({ snapshot }) => {
  const badge = STATE_BADGE[snapshot.state] ?? STATE_BADGE.idle
  const elapsed = snapshot.startedAt
    ? ((snapshot.completedAt ?? Date.now()) - snapshot.startedAt) / 1000
    : 0
  const outputTokens = snapshot.usage?.output_tokens ?? 0
  const tokensPerSec = elapsed > 0 && outputTokens > 0 ? (outputTokens / elapsed).toFixed(1) : '—'

  return (
    <div className="flex items-center gap-3 text-[10px] text-greyscale-500 dark:text-greyscale-400">
      <Badge color={badge.color} variant="outline" className="text-[10px] px-1.5 py-0">
        {badge.label}
      </Badge>
      {outputTokens > 0 && (
        <span className="flex items-center gap-1">
          <Cpu size={10} />
          {outputTokens} tok
        </span>
      )}
      {tokensPerSec !== '—' && (
        <span className="flex items-center gap-1">
          <Zap size={10} />
          {tokensPerSec} tok/s
        </span>
      )}
      {snapshot.creditsCharged > 0 && (
        <span className="flex items-center gap-1">
          <Coins size={10} />
          {snapshot.creditsCharged} cr
        </span>
      )}
      {snapshot.error && (
        <span className="text-red-500 truncate max-w-[200px]" title={snapshot.error}>
          {snapshot.error}
        </span>
      )}
    </div>
  )
}
