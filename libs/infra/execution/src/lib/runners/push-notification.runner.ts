import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class PushNotificationRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'push_notification'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — send push notification via LenserFight notification system
    return {
      output: {
        mediaType: 'text',
        data: { delivered: false, recipientLenserId: '', nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
