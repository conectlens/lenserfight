/**
 * OutputContractSection — shows what a node produces for downstream nodes.
 */

import { ArrowRight } from 'lucide-react'
import React from 'react'

import type { RunnerOutputField } from '../../types'

export interface OutputContractSectionProps {
  outputs?: RunnerOutputField[]
}

export function OutputContractSection({ outputs }: OutputContractSectionProps) {
  if (!outputs || outputs.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-greyscale-500 dark:text-greyscale-400">
        Outputs
      </p>
      <div className="rounded-xl border border-surface-border bg-surface-raised p-2.5 space-y-1">
        {outputs.map((out) => (
          <div key={out.key} className="flex items-center gap-1.5 text-[10px]">
            <ArrowRight size={10} className="text-greyscale-400 flex-shrink-0" />
            <span className="font-mono font-medium text-greyscale-700 dark:text-greyscale-200">
              {out.key}
            </span>
            <span className="text-greyscale-400">({out.type})</span>
            <span className="text-greyscale-400 truncate">{out.description}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
