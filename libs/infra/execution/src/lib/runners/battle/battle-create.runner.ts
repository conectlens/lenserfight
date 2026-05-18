/**
 * BattleCreateRunner — declares a battle creation intent within a workflow.
 *
 * GRASP Indirection: this runner does NOT call fn_create_battle directly
 * because that RPC requires the caller's JWT for get_auth_lenser_id(). Instead
 * it validates required fields and emits a structured __battle_create_request
 * envelope. The composition root (app layer or workflow executor) processes
 * the envelope by forwarding the user's auth token to fn_create_battle.
 *
 * Config schema (nodeConfig):
 *   title:              string  — battle title (required)
 *   taskPrompt:         string  — task description (required)
 *   battleType:         string  — battle type (required)
 *   voterEligibility:   string  — 'open' | 'followers' | 'invite_only' (default: 'open')
 *   workflowId?:        string  — optional workflow association
 *   lensId?:            string  — optional lens association
 *   handicapConfig?:    object  — optional AI handicap policy
 *
 * Output data shape:
 *   { __battle_create_request: true, title, taskPrompt, battleType, voterEligibility,
 *     workflowId?, lensId?, handicapConfig? }
 */

import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class BattleCreateRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'battle_create'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const startedAt = Date.now()
    const { nodeConfig, signal } = ctx

    const title            = nodeConfig['title']            as string | undefined
    const taskPrompt       = nodeConfig['taskPrompt']       as string | undefined
    const battleType       = nodeConfig['battleType']       as string | undefined
    const voterEligibility = (nodeConfig['voterEligibility'] as string | undefined) ?? 'open'
    const workflowId       = nodeConfig['workflowId']       as string | undefined
    const lensId           = nodeConfig['lensId']           as string | undefined
    const handicapConfig   = nodeConfig['handicapConfig']   as Record<string, unknown> | undefined

    const missing: string[] = []
    if (!title)       missing.push('title')
    if (!taskPrompt)  missing.push('taskPrompt')
    if (!battleType)  missing.push('battleType')

    if (missing.length > 0) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: {
            error:  `battle_create: missing required fields: ${missing.join(', ')}`,
            nodeId: ctx.nodeId,
          },
          durationMs: 0,
        },
      }
    }

    if (signal?.aborted) {
      throw new Error('Execution aborted')
    }

    // Emit a creation request envelope. The app layer forwards this to
    // fn_create_battle with the authenticated user's JWT.
    return {
      output: {
        mediaType: 'text',
        text:      title!,
        data: {
          __battle_create_request: true,
          title,
          taskPrompt,
          battleType,
          voterEligibility,
          ...(workflowId     ? { workflowId }     : {}),
          ...(lensId         ? { lensId }         : {}),
          ...(handicapConfig ? { handicapConfig } : {}),
          executedBy: 'battle_create_runner',
        },
        durationMs: Date.now() - startedAt,
        metadata: {
          battleType,
          executedBy: 'battle_create_runner',
        },
      },
    }
  }
}
