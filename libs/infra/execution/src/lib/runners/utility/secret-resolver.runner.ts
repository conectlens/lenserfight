import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class SecretResolverRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'secret_resolver'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — resolve secrets from vault/env and inject into workflow scope
    return {
      output: {
        mediaType: 'text',
        text: 'Secret resolved.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
