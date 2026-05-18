import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class HttpRequestRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'http_request'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — make HTTP request with full method/header/body control
    return {
      output: {
        mediaType: 'text',
        data: { data: null, status: 200, headers: {}, nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
