import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

type AutomationRunnerConfig = {
  nodeType: WorkflowNodeType
  provider: 'asana' | 'monday' | 'zapier'
  capability: 'tasks' | 'boards' | 'webhooks'
  operation: string
  requiredScopes: string[]
  displayName: string
}

export class AutomationConnectorRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType

  constructor(private readonly config: AutomationRunnerConfig) {
    this.nodeType = config.nodeType
  }

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const connectorRef = ctx.nodeConfig['connectorRef'] as string | undefined
    const params = { ...ctx.nodeConfig }
    delete params['connectorRef']

    if (!connectorRef) {
      return {
        output: {
          mediaType: 'json',
          text: '',
          data: { error: 'Missing connectorRef', provider: this.config.provider },
          durationMs: 0,
        },
      }
    }

    if (ctx.executeConnectorOperation) {
      return {
        output: await ctx.executeConnectorOperation({
          connectorRef,
          provider: this.config.provider,
          capability: this.config.capability,
          operation: this.config.operation,
          requiredScopes: this.config.requiredScopes,
          params,
        }),
      }
    }

    return {
      output: {
        mediaType: 'json',
        text: `[${this.config.displayName}]`,
        data: {
          provider: this.config.provider,
          capability: this.config.capability,
          operation: this.config.operation,
          connectorRef,
          params,
          mock: true,
        },
        durationMs: 0,
      },
    }
  }
}

export const automationConnectorRunnerFactories = [
  () => new AutomationConnectorRunner({
    nodeType: 'asana_task_create',
    provider: 'asana',
    capability: 'tasks',
    operation: 'create_task',
    requiredScopes: ['asana:tasks:write'],
    displayName: 'Asana task create',
  }),
  () => new AutomationConnectorRunner({
    nodeType: 'asana_task_update',
    provider: 'asana',
    capability: 'tasks',
    operation: 'update_task',
    requiredScopes: ['asana:tasks:write'],
    displayName: 'Asana task update',
  }),
  () => new AutomationConnectorRunner({
    nodeType: 'asana_project_tasks_list',
    provider: 'asana',
    capability: 'tasks',
    operation: 'list_project_tasks',
    requiredScopes: ['asana:tasks:read'],
    displayName: 'Asana project tasks list',
  }),
  () => new AutomationConnectorRunner({
    nodeType: 'monday_item_create',
    provider: 'monday',
    capability: 'boards',
    operation: 'create_item',
    requiredScopes: ['monday:boards:write'],
    displayName: 'Monday item create',
  }),
  () => new AutomationConnectorRunner({
    nodeType: 'monday_item_update',
    provider: 'monday',
    capability: 'boards',
    operation: 'update_item',
    requiredScopes: ['monday:boards:write'],
    displayName: 'Monday item update',
  }),
  () => new AutomationConnectorRunner({
    nodeType: 'monday_board_items_list',
    provider: 'monday',
    capability: 'boards',
    operation: 'list_board_items',
    requiredScopes: ['monday:boards:read'],
    displayName: 'Monday board items list',
  }),
  () => new AutomationConnectorRunner({
    nodeType: 'zapier_webhook_trigger',
    provider: 'zapier',
    capability: 'webhooks',
    operation: 'trigger_webhook',
    requiredScopes: ['zapier:webhook:trigger'],
    displayName: 'Zapier webhook trigger',
  }),
]
