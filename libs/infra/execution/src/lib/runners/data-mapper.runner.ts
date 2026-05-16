import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class DataMapperRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'data_mapper'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — map/transform data structure using configured schema
    return {
      output: {
        mediaType: 'text',
        text: 'Data mapped.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
