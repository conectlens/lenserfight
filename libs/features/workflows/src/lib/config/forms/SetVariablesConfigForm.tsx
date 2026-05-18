/**
 * SetVariablesConfigForm — custom form for the `set_variables` runner.
 *
 * Provides a dynamic key-value pair editor.
 * Extracted from WorkflowUtilityNodeConfig (original lines 210-277).
 */

import { Button } from '@lenserfight/ui/components'
import { Input } from '@lenserfight/ui/forms'
import { Plus, Trash2 } from 'lucide-react'
import React, { useState } from 'react'

import type { RunnerConfigFormProps } from '../../types'
import { ConfigFormFooter } from '../shared/ConfigFormFooter'

export function SetVariablesConfigForm({ nodeId, config, onSave, onClose }: RunnerConfigFormProps) {
  const existing = (config.param_overrides ?? {}) as Record<string, string>
  const initialVars: Array<[string, string]> = Object.entries(existing)
    .filter(([k]) => !k.startsWith('__'))
  const [variables, setVariables] = useState<Array<[string, string]>>(
    initialVars.length > 0 ? initialVars : [['', '']]
  )

  const handleSave = () => {
    const overrides: Record<string, string> = {}
    for (const [key, value] of variables) {
      if (key.trim()) overrides[key.trim()] = value
    }
    onSave(nodeId, { ...config, param_overrides: overrides })
    onClose()
  }

  return (
    <>
      <div className="space-y-2">
        <label className="text-[11px] font-medium text-greyscale-600 dark:text-greyscale-300">
          Variables (key = value)
        </label>
        {variables.map(([key, value], i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <Input
              value={key}
              onChange={(e) => {
                const next = [...variables]
                next[i] = [e.target.value, value]
                setVariables(next)
              }}
              placeholder="key"
              className="flex-1 font-mono text-xs"
            />
            <span className="text-greyscale-400 text-[10px]">=</span>
            <Input
              value={value}
              onChange={(e) => {
                const next = [...variables]
                next[i] = [key, e.target.value]
                setVariables(next)
              }}
              placeholder="value or {{nodeId.field}}"
              className="flex-1 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setVariables(variables.filter((_, j) => j !== i))}
              className="text-greyscale-400 hover:text-status-red transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setVariables([...variables, ['', '']])}
          className="!h-7 gap-1 text-[11px] text-greyscale-500"
        >
          <Plus size={10} /> Add variable
        </Button>
      </div>
      <ConfigFormFooter onSave={handleSave} onClose={onClose} />
    </>
  )
}
