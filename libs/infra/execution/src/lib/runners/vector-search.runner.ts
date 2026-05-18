import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class VectorSearchRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'vector_search'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — perform similarity search against vector store
    return {
      output: {
        mediaType: 'text',
        text: 'Vector search complete.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
