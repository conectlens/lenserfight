import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMcpTool } from '../register-tool.js';
import { getToolMeta } from '../tool-metadata.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail } from '../../types.js';
import { battleService } from '../../services/battle.service.js';
import { McpError } from '../../services/mcp-error.js';

const meta = getToolMeta('create_battle');
const TOOL = meta.name;

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

export function registerBattleCreate(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta,
    {
      title: z.string().min(1).max(200),
      task_prompt: z.string().min(1).max(32000),
      battle_type: z.enum(['ai_vs_ai','human_vs_human_ai_votes','human_vs_human_open_votes','human_vs_ai','workflow_battle','lenser_battle']).default('ai_vs_ai').optional(),
      judging_mode: z.enum(['community_vote','ai_judge','rubric_score','auto_score']).default('ai_judge').optional(),
      max_contenders: z.number().int().min(2).max(26).default(2).optional(),
      ai_judge_model_key: z.string().optional(),
    },
    async (args) => {
      const t0 = Date.now();
      try {
        const battleId = await battleService.create(sb, {
          title: args.title,
          slug: slugify(args.title),
          task_prompt: args.task_prompt,
          rubric_id: null,
        });

        const hasConfig =
          args.battle_type || args.judging_mode || args.max_contenders || args.ai_judge_model_key;
        if (hasConfig) {
          await battleService.updateConfig(sb, {
            battle_id: battleId,
            battle_type: args.battle_type ?? null,
            judging_mode: args.judging_mode ?? null,
            max_contenders: args.max_contenders ?? null,
            ai_judge_model_key: args.ai_judge_model_key ?? null,
          });
        }

        return ok({ id: battleId, title: args.title }, TOOL, t0);
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
