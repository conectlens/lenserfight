/**
 * SubWorkflowConfigForm — custom form for the `sub_workflow` runner.
 *
 * Provides workflow UUID selector and input mapping JSON editor.
 * Extracted from WorkflowUtilityNodeConfig (original lines 493-544).
 */

import { Input, TextArea, Field } from '@lenserfight/ui/forms'
import React, { useState } from 'react'

import type { RunnerConfigFormProps } from '../../types'
import { ConfigFormFooter } from '../shared/ConfigFormFooter'

export function SubWorkflowConfigForm({ nodeId, config, onSave, onClose }: RunnerConfigFormProps) {
  const existing = (config.param_overrides ?? {}) as Record<string, string>
  const [workflowId, setWorkflowId] = useState(existing['__workflowId'] ?? '')
  const [inputMappingJson, setInputMappingJson] = useState(existing['__inputMapping'] ?? '{}')

  const handleSave = () => {
    onSave(nodeId, {
      ...config,
      param_overrides: {
        ...existing,
        __workflowId: workflowId,
        __inputMapping: inputMappingJson,
      },
    })
    onClose()
  }

  return (
    <>
      <Field label="Sub-Workflow ID (UUID)">
        <Input
          value={workflowId}
          onChange={(e) => setWorkflowId(e.target.value)}
          placeholder="12345678-1234-1234-1234-123456789abc"
          className="font-mono text-xs"
        />
      </Field>
      <Field
        label="Input Mapping (JSON)"
        hint="Maps sub-workflow root inputs to upstream outputs (dot-path format)."
      >
        <TextArea
          value={inputMappingJson}
          onChange={(e) => setInputMappingJson(e.target.value)}
          minRows={4}
          autoResize
          placeholder={'{\n  "query": "n1.text",\n  "count": "n1.count"\n}'}
          className="font-mono text-xs"
        />
      </Field>
      <div className="rounded-xl border border-surface-border bg-surface-raised p-2.5 text-[10px] text-greyscale-400">
        Max nesting depth: 3 levels. Sub-workflow inherits parent budget.
      </div>
      <ConfigFormFooter onSave={handleSave} onClose={onClose} />
    </>
  )
}
