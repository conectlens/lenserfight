/**
 * WorkflowOutputFieldTree — renders all output fields for one upstream node.
 *
 * Shows schema fields with live values when available. Before execution,
 * only the declared schema is displayed with a soft "Run to see live values"
 * message. After execution, actual values appear next to field names.
 */
import { Zap } from 'lucide-react'
import React from 'react'

import type { WorkflowNodeSchemaField } from '@lenserfight/infra/execution'

import { WorkflowOutputFieldRow } from './WorkflowOutputFieldRow'

interface WorkflowOutputFieldTreeProps {
  nodeId: string
  outputSchema: WorkflowNodeSchemaField[]
  executedValues: Record<string, unknown> | null
  hasRun: boolean
}

export function WorkflowOutputFieldTree({
  nodeId,
  outputSchema,
  executedValues,
  hasRun,
}: WorkflowOutputFieldTreeProps) {
  if (outputSchema.length === 0) {
    return (
      <p className="text-[10px] text-greyscale-400 italic px-2">No output fields declared.</p>
    )
  }

  return (
    <div className="space-y-0.5">
      {outputSchema.map((field) => {
        const liveValue = executedValues?.[field.name]
        const sensitive = (field as WorkflowNodeSchemaField & { sensitive?: boolean }).sensitive

        return (
          <WorkflowOutputFieldRow
            key={field.name}
            nodeId={nodeId}
            fieldName={field.name}
            fieldType={field.type}
            fieldDescription={field.description}
            liveValue={liveValue}
            sensitive={sensitive}
          />
        )
      })}

      {!hasRun && (
        <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-surface-raised">
          <Zap size={10} className="text-primary-yellow-500 flex-shrink-0" />
          <p className="text-[10px] text-greyscale-400">
            Run the workflow to see live output values.
          </p>
        </div>
      )}
    </div>
  )
}
