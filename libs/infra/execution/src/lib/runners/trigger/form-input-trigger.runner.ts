import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

interface FormField {
  name: string
  type?: string
  required?: boolean
  label?: string
}

export class FormInputTriggerRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'form_input_trigger'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const fields = (ctx.nodeConfig['fields'] as FormField[] | undefined) ?? []
    const formData: Record<string, unknown> = {}

    for (const field of fields) {
      const value = ctx.resolvedParams[field.name]
      if (value === undefined || value === null) {
        if (field.required) {
          throw new Error(
            `Required form field "${field.label ?? field.name}" was not provided. ` +
            `Pass it in the workflow root inputs before running.`,
          )
        }
        // Optional field — skip rather than emit null
        continue
      }
      formData[field.name] = value
    }

    return {
      output: {
        mediaType: 'json',
        data: { formData },
        durationMs: 0,
      },
    }
  }
}
