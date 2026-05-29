import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ok, fail } from '../../types.js';
import { lensService } from '../../services/lens.service.js';
import { McpError } from '../../services/mcp-error.js';
import { resolveTemplate } from './lens-run.js';

const TOOL = 'find_and_run_lens';

interface LensSearchHit {
  id: string;
  title: string | null;
  description: string | null;
  author_handle: string | null;
  head_version_id: string | null;
}

export function registerLensFindAndRun(server: McpServer, sb: SupabaseClient): void {
  server.tool(
    TOOL,
    `One-shot: find the best matching lens for a topic and either run it (if all required params are supplied) or report what's missing.

PURPOSE: Use this when the user asks "use the X lens to do Y" — instead of chaining search_lenses + get_lens + run_lens, this single call does the lookup, picks the top match, and either returns the resolved prompt or the missing-parameter spec.

INPUTS:
- query: free-text search (e.g. "logo brief", "code review", "translation")
- param_values: object of {ParameterLabel: "value"} pairs you already know

OUTCOMES:
1. status="ready": resolved_prompt is set — execute it and return result to user.
2. status="needs_params": missing[] lists labels to ask the user for, plus all_parameters[] with optional flags.
3. status="no_match": no lens matches the query — ask the user to be more specific or call list_lenses.`,
    {
      query: z.string().min(1).describe('What the user wants to do, in natural language'),
      param_values: z.record(z.string(), z.string()).default({}).optional(),
      visibility: z.enum(['public', 'community', 'private']).optional(),
    },
    async (args) => {
      const t0 = Date.now();
      const values: Record<string, string> = (args.param_values ?? {}) as Record<string, string>;

      try {
        const { items } = await lensService.search(sb, {
          query: args.query,
          limit: 5,
          offset: 0,
          visibility: args.visibility,
        });
        const hits = items as LensSearchHit[];

        if (hits.length === 0) {
          return ok(
            {
              status: 'no_match',
              query: args.query,
              hint: 'No lens matched. Try a broader keyword, ask the user for a topic, or call list_lenses to browse available lenses.',
            },
            TOOL,
            t0
          );
        }

        const best = hits[0];

        const resolveData = await lensService.resolveTemplate(sb, { lens_id: best.id });
        if (!resolveData) {
          return fail('NOT_FOUND', `Lens ${best.id} resolved to no template`, {}, TOOL, t0);
        }

        const { resolved, missing, used } = resolveTemplate(
          resolveData.template_body,
          resolveData.parameters ?? [],
          values
        );

        if (missing.length > 0) {
          return ok(
            {
              status: 'needs_params',
              lens: { id: best.id, title: resolveData.title, description: resolveData.description },
              missing,
              all_parameters: resolveData.parameters,
              other_candidates: hits.slice(1).map((h) => ({ id: h.id, title: h.title })),
              instruction: `Ask the user for these labels: ${missing.join(', ')}. Then call run_lens(lens_id="${best.id}", param_values={...}).`,
            },
            TOOL,
            t0
          );
        }

        return ok(
          {
            status: 'ready',
            lens: { id: best.id, title: resolveData.title, description: resolveData.description },
            resolved_prompt: resolved,
            params_used: used,
            version_id: resolveData.version_id,
            estimated_input_tokens: Math.ceil(resolved.length / 4),
            instruction:
              'Execute the resolved_prompt and return the result to the user. This tool does not call any LLM.',
          },
          TOOL,
          t0
        );
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0);
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0);
      }
    }
  );
}
