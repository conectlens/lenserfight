import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class CacheReadRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'cache_read'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — read value from workflow cache by key
    return {
      output: {
        mediaType: 'text',
        text: 'Cache read complete.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}

export class CacheWriteRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'cache_write'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — write value to workflow cache with TTL
    return {
      output: {
        mediaType: 'text',
        text: 'Cache write complete.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
