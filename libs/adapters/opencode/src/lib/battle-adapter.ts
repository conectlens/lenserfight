import { callRpc } from '@lenserfight/cli-client'
import { tool } from '@opencode-ai/plugin'

import type { OpencodeToolAdapterV1, OpencodeToolMetadata } from './opencode-tool-adapter'

// See lens-adapter.ts — args must be built off `tool.schema`, the zod
// instance @opencode-ai/plugin's own `tool()` factory expects, not this
// repo's top-level `zod` import (structurally incompatible zod instances).
const z = tool.schema

/** Mirrors the slug generation in apps/mcp-server/src/tools/battle/battle-create.ts. */
function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}

const BATTLE_TYPES = [
  'ai_vs_ai',
  'human_vs_human_ai_votes',
  'human_vs_human_open_votes',
  'human_vs_ai',
  'workflow_battle',
  'lenser_battle',
] as const

const JUDGING_MODES = ['community_vote', 'ai_judge', 'rubric_score', 'auto_score'] as const

/**
 * Wraps the same `fn_battles_create` + `fn_mcp_battle_update_config` RPCs the
 * MCP `create_battle` tool calls (apps/mcp-server/src/tools/battle/battle-create.ts),
 * through `@lenserfight/cli-client`'s `callRpc` (user auth token) rather than
 * the MCP server's service-role Supabase client.
 */
export function createBattleCreateAdapter(): OpencodeToolAdapterV1 {
  const metadata: OpencodeToolMetadata = {
    description: 'Create a new LenserFight battle to compare lens/agent outputs.',
    mirrorsMcpTool: 'create_battle',
  }

  return {
    id: () => 'lf_battle_create',
    metadata: () => metadata,
    toToolDefinition: () =>
      tool({
        description: metadata.description,
        args: {
          title: z.string().min(1).max(200).describe('Battle title.'),
          task_prompt: z.string().min(1).max(32000).describe('The task/prompt contenders will respond to.'),
          battle_type: z.enum(BATTLE_TYPES).optional().describe('Defaults to ai_vs_ai.'),
          judging_mode: z.enum(JUDGING_MODES).optional().describe('Defaults to ai_judge.'),
          max_contenders: z.number().int().min(2).max(26).optional().describe('Defaults to 2.'),
          ai_judge_model_key: z.string().optional(),
        },
        async execute(rawArgs) {
          const {
            title,
            task_prompt: taskPrompt,
            battle_type: battleType,
            judging_mode: judgingMode,
            max_contenders: maxContenders,
            ai_judge_model_key: aiJudgeModelKey,
          } = rawArgs

          const battleId = await callRpc<string>(
            'fn_battles_create',
            {
              p_title: title,
              p_slug: slugify(title),
              p_task_prompt: taskPrompt,
              p_rubric_id: null,
            },
            { requireAuth: true },
          )

          const hasConfig = battleType || judgingMode || maxContenders || aiJudgeModelKey
          if (hasConfig) {
            await callRpc(
              'fn_mcp_battle_update_config',
              {
                p_battle_id: battleId,
                p_battle_type: battleType ?? null,
                p_judging_mode: judgingMode ?? null,
                p_max_contenders: maxContenders ?? null,
                p_ai_judge_model_key: aiJudgeModelKey ?? null,
              },
              { requireAuth: true },
            )
          }

          return {
            title: `Created battle: ${title}`,
            output: `Battle "${title}" created with id ${battleId}.`,
            metadata: { id: battleId, title },
          }
        },
      }),
  }
}
