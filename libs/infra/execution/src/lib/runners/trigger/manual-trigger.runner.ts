import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class ManualTriggerRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'manual_trigger'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // Propagate all root inputs as a structured payload. Downstream nodes
    // receive the user-supplied parameters (topic, audience, etc.) via edges.
    return {
      output: {
        mediaType: 'json',
        data: { ...ctx.resolvedParams },
        durationMs: 0,
      },
    }
  }
}
