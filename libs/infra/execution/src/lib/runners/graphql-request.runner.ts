import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class GraphqlRequestRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'graphql_request'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — execute GraphQL query/mutation against external endpoint
    return {
      output: {
        mediaType: 'text',
        data: { data: null, errors: [], nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
