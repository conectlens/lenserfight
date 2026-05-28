import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail } from '../../types.js';

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

export function registerBattleCreate(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'battle_create',
    'Create a new battle. The task_prompt defines what competitors must do. Returns the new battle with its ID.',
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
        const { data, error } = (await sb.rpc('fn_battles_create' as never, {
          p_title: args.title,
          p_slug: slugify(args.title),
          p_task_prompt: args.task_prompt,
          p_rubric_id: null,
        })) as unknown as { data: string | null; error: { message: string } | null };
        if (error) throw new Error(error.message);
        if (!data) throw new Error('No battle ID returned');

        const battleId = data;
        const hasConfig =
          args.battle_type || args.judging_mode || args.max_contenders || args.ai_judge_model_key;

        if (hasConfig) {
          const { error: cfgErr } = (await sb.rpc('fn_mcp_battle_update_config' as never, {
            p_battle_id: battleId,
            p_battle_type: args.battle_type ?? null,
            p_judging_mode: args.judging_mode ?? null,
            p_max_contenders: args.max_contenders ?? null,
            p_ai_judge_model_key: args.ai_judge_model_key ?? null,
          })) as unknown as { data: unknown; error: { message: string } | null };
          if (cfgErr) throw new Error(cfgErr.message);
        }

        return ok({ id: battleId, title: args.title }, 'battle_create', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'battle_create', t0);
      }
    }
  );
}
