import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { lensService } from '../../services/lens.service.js'
import { McpError } from '../../services/mcp-error.js'
import { ok, fail } from '../../types.js'
import { registerMcpTool } from '../register-tool.js'
import { getToolMeta } from '../tool-metadata.js'

const meta = getToolMeta('create_lens')
const TOOL = meta.name

export function registerLensCreate(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(
    server,
    meta,
    {
      title: z.string().min(1).max(200).describe('Short, descriptive Lens name.'),
      template_body: z
        .string()
        .min(50, 'Template must be at least 50 characters')
        .describe(
          'Reusable AI instructions. Declare values with [[Label]], [[Label!]], or a typed token such as [[Context:textarea]].'
        ),
      visibility: z
        .enum(['public', 'community', 'private'])
        .default('public')
        .optional()
        .describe('Who can discover the Lens.'),
      params: z
        .array(
          z.object({
            label: z.string().min(1).describe('Exact label used inside the template token.'),
            optional: z
              .boolean()
              .default(false)
              .optional()
              .describe('Must match whether the template token uses the ! suffix.'),
          })
        )
        .default([])
        .optional()
        .describe('Parameter declarations matching every dynamic template token.'),
    },
    async (args) => {
      const t0 = Date.now()
      try {
        const data = await lensService.create(sb, {
          title: args.title,
          template_body: args.template_body,
          visibility: args.visibility ?? 'public',
          params: (args.params ?? []).map((p) => ({
            label: p.label,
            optional: p.optional ?? false,
          })),
        })
        return ok(data, TOOL, t0)
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0)
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0)
      }
    }
  )
}
