import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class SmsSendRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'sms_send'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — send SMS via Twilio or compatible provider
    return {
      output: {
        mediaType: 'text',
        data: { sid: '', status: 'queued', to: '', nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
