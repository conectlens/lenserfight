import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail } from '../../types.js';
import { resolveTemplate } from './lens-run.js';

interface VersionParam {
  id: string;
  label: string;
  optional: boolean;
}

interface ResolveTemplateResult {
  lens_id: string;
  version_id: string;
  template_body: string;
  parameters: VersionParam[];
  title?: string | null;
  description?: string | null;
}

interface LensSearchHit {
  id: string;
  title: string | null;
  description: string | null;
  author_handle: string | null;
  head_version_id: string | null;
}

export function registerLensFindAndRun(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    'lens_find_and_run',
    `One-shot: find the best matching lens for a topic and either run it (if all required params are supplied) or report what's missing.

PURPOSE: Use this when the user asks "use the X lens to do Y" — instead of chaining lens_search + lens_get + lens_run, this single call does the lookup, picks the top match, and either returns the resolved prompt or the missing-parameter spec.

INPUTS:
- query: free-text search (e.g. "logo brief", "code review", "translation")
- param_values: object of {ParameterLabel: "value"} pairs you already know

OUTCOMES:
1. status="ready": resolved_prompt is set — execute it and return result to user.
2. status="needs_params": missing[] lists labels to ask the user for, plus all_parameters[] with optional flags.
3. status="no_match": no lens matches the query — ask the user to be more specific or call lens_list.`,
    {
      query: z.string().min(1).describe('What the user wants to do, in natural language'),
      param_values: z.record(z.string(), z.string()).default({}).optional(),
      visibility: z.enum(['public', 'community', 'private']).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const values: Record<string, string> = (args.param_values ?? {}) as Record<string, string>;

      try {
        // 1. Search for matching lenses
        const { data: searchData, error: searchErr } = (await sb.rpc('fn_mcp_lens_search' as never, {
          p_query: args.query,
          p_visibility: args.visibility ?? null,
          p_limit: 5,
          p_offset: 0,
        })) as unknown as {
          data: { data: LensSearchHit[]; count: number } | null;
          error: { message: string } | null;
        };
        if (searchErr) throw new Error(searchErr.message);

        const hits = searchData?.data ?? [];
        if (hits.length === 0) {
          return ok({
            status: 'no_match',
            query: args.query,
            hint: 'No lens matched. Try a broader keyword, ask the user for a topic, or call lens_list to browse available lenses.',
          }, 'lens_find_and_run', t0);
        }

        const best = hits[0];

        // 2. Resolve template + params for the top hit
        const { data: resolveData, error: resolveErr } = (await sb.rpc(
          'fn_mcp_lens_resolve_template' as never,
          { p_lens_id: best.id, p_version_id: null }
        )) as unknown as {
          data: ResolveTemplateResult | null;
          error: { message: string } | null;
        };
        if (resolveErr) throw new Error(resolveErr.message);
        if (!resolveData) {
          return fail('NOT_FOUND', `Lens ${best.id} resolved to no template`, {}, 'lens_find_and_run', t0);
        }

        const { resolved, missing, used } = resolveTemplate(
          resolveData.template_body,
          resolveData.parameters ?? [],
          values
        );

        if (missing.length > 0) {
          return ok({
            status: 'needs_params',
            lens: {
              id: best.id,
              title: resolveData.title,
              description: resolveData.description,
            },
            missing,
            all_parameters: resolveData.parameters,
            other_candidates: hits.slice(1).map((h) => ({ id: h.id, title: h.title })),
            instruction: `Ask the user for these labels: ${missing.join(', ')}. Then call lens_run(lens_id="${best.id}", param_values={...}).`,
          }, 'lens_find_and_run', t0);
        }

        return ok({
          status: 'ready',
          lens: {
            id: best.id,
            title: resolveData.title,
            description: resolveData.description,
          },
          resolved_prompt: resolved,
          params_used: used,
          version_id: resolveData.version_id,
          estimated_input_tokens: Math.ceil(resolved.length / 4),
          instruction: 'Execute the resolved_prompt and return the result to the user. This tool does not call any LLM.',
        }, 'lens_find_and_run', t0);
      } catch (e) {
        return fail('DB_ERROR', (e as Error).message, {}, 'lens_find_and_run', t0);
      }
    }
  );
}
