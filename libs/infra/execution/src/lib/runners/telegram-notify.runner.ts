import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class TelegramNotifyRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'telegram_notify'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — send message via Telegram Bot API
    return {
      output: {
        mediaType: 'text',
        data: { messageId: 0, chatId: '', ok: true, nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
