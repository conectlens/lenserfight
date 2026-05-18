/**
 * SwitchConfigForm — custom form for the `switch` runner.
 *
 * Provides input path, default branch, and dynamic case JSON editing.
 * Extracted from WorkflowUtilityNodeConfig (original lines 279-338).
 */

import { Input, TextArea, Field } from '@lenserfight/ui/forms'
import React, { useState } from 'react'

import type { RunnerConfigFormProps } from '../../types'
import { ConfigFormFooter } from '../shared/ConfigFormFooter'

export function SwitchConfigForm({ nodeId, config, onSave, onClose }: RunnerConfigFormProps) {
  const existing = (config.param_overrides ?? {}) as Record<string, string>
  const [inputPath, setInputPath] = useState(existing['__inputPath'] ?? '')
  const [defaultBranch, setDefaultBranch] = useState(existing['__defaultBranch'] ?? 'default')
  const [casesJson, setCasesJson] = useState(existing['__cases'] ?? '[]')

  const handleSave = () => {
    onSave(nodeId, {
      ...config,
      param_overrides: {
        ...existing,
        __inputPath: inputPath,
        __defaultBranch: defaultBranch,
        __cases: casesJson,
      },
    })
    onClose()
  }

  return (
    <>
      <Field label="Input Path (dot-notation)">
        <Input
          value={inputPath}
          onChange={(e) => setInputPath(e.target.value)}
          placeholder="e.g. response.status"
          className="font-mono text-xs"
        />
      </Field>
      <Field label="Default Branch Label">
        <Input
          value={defaultBranch}
          onChange={(e) => setDefaultBranch(e.target.value)}
          className="text-xs"
        />
      </Field>
      <Field
        label="Cases (JSON)"
        hint="Operators: equals, not_equals, contains, greater_than, less_than, regex_match, is_empty, is_not_empty"
      >
        <TextArea
          value={casesJson}
          onChange={(e) => setCasesJson(e.target.value)}
          minRows={6}
          autoResize
          placeholder={'[\n  { "label": "success", "expression": "", "operator": "equals", "value": "ok" }\n]'}
          className="font-mono text-xs"
        />
      </Field>
      <ConfigFormFooter onSave={handleSave} onClose={onClose} />
    </>
  )
}
