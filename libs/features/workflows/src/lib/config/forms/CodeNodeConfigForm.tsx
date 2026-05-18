/**
 * CodeNodeConfigForm — custom form for the `code` runner.
 *
 * Provides a code textarea with mono font and configurable timeout.
 * Extracted from WorkflowUtilityNodeConfig (original lines 119-165).
 */

import { TextArea, Input, Field } from '@lenserfight/ui/forms'
import React, { useState } from 'react'

import type { RunnerConfigFormProps } from '../../types'
import { ConfigFormFooter } from '../shared/ConfigFormFooter'

export function CodeNodeConfigForm({ nodeId, config, onSave, onClose }: RunnerConfigFormProps) {
  const existing = (config.param_overrides ?? {}) as Record<string, string>
  const [code, setCode] = useState(existing['__code'] ?? '')
  const [timeoutMs, setTimeoutMs] = useState(existing['__timeoutMs'] ?? '5000')

  const handleSave = () => {
    onSave(nodeId, {
      ...config,
      param_overrides: { ...existing, __code: code, __timeoutMs: timeoutMs },
    })
    onClose()
  }

  return (
    <>
      <Field
        label="JavaScript Code"
        hint="No network, no eval, no require. Max 10,000 chars. 5s timeout."
      >
        <TextArea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          minRows={10}
          autoResize
          placeholder={'// Access upstream data via `input` object\n// Access workflow vars via `params`\n// Return a value (last expression)\n\ninput.n1.count * 2'}
          className="font-mono text-xs"
        />
      </Field>
      <Field label="Timeout (ms)">
        <Input
          type="number"
          value={timeoutMs}
          onChange={(e) => setTimeoutMs(e.target.value)}
          min={100}
          max={5000}
          className="text-xs"
        />
      </Field>
      <ConfigFormFooter onSave={handleSave} onClose={onClose} />
    </>
  )
}
