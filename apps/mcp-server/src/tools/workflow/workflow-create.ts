import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { McpError } from '../../services/mcp-error.js'
import { workflowService } from '../../services/workflow.service.js'
import { ok, fail, zUuid } from '../../types.js'
import { registerMcpTool } from '../register-tool.js'
import { getToolMeta } from '../tool-metadata.js'
import { p } from '../tool-params.js'

import { validateWorkflowGraph } from './workflow-validate.js'
import { TRIGGER_NODE_TYPES } from './workflow-trigger-node-types.js'

const meta = getToolMeta('create_workflow')
const TOOL = meta.name

const stepKey = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_-]*$/, 'Use a readable lowercase key such as start or research_step.')

// Cast is safe: the catalog always has at least one `trigger`-category entry
// (enforced by catalog-runner-coverage.spec.ts's "all 11 categories present" check).
const triggerType = z.enum(TRIGGER_NODE_TYPES as [string, ...string[]])

const connectorSchema = z.object({
  provider: z.string().min(1).max(64).describe('Connector provider, for example notion or github.'),
  connection_ref: z
    .string()
    .min(1)
    .max(200)
    .describe('Reference to a connector already configured by the user; never a credential.'),
  capability: z.string().min(1).max(100).optional().describe('Required connector capability.'),
})

const stepSchema = z.object({
  key: stepKey.describe('Readable local id used by connections, for example start or research.'),
  kind: z.enum(['trigger', 'lens', 'tool']).describe('The responsibility of this workflow step.'),
  name: z.string().min(1).max(200).describe('Human-readable canvas label.'),
  node_type: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .describe('Required trigger type or deterministic tool type from the workflow palette.'),
  lens_id: zUuid
    .optional()
    .describe('Required for Lens steps; obtain it from create_lens or search_lenses.'),
  version_id: zUuid
    .optional()
    .describe('Optional pinned Lens version; omit to use the head version.'),
  parameters: z
    .record(z.string(), z.unknown())
    .default({})
    .optional()
    .describe('User-filled Lens parameters or deterministic tool values, keyed by readable label.'),
  config: z
    .record(z.string(), z.unknown())
    .default({})
    .optional()
    .describe('Non-secret trigger or tool configuration, such as cronExpression and timezone.'),
  connector: connectorSchema
    .optional()
    .describe('Saved connector reference for an external service.'),
})

const connectionSchema = z.object({
  from_step: stepKey.describe('Source step key.'),
  output_key: z
    .string()
    .min(1)
    .max(100)
    .default('output')
    .optional()
    .describe('Named source output; defaults to output.'),
  to_step: stepKey.describe('Destination step key.'),
  input_parameter: z.string().min(1).max(200).describe('Exact destination Lens/tool input label.'),
})

const SENSITIVE_CONFIG_KEYS = new Set([
  'api_key',
  'key_ref_id',
  'local_key_id',
  'password',
  'secret',
  'token',
  'webhook_secret',
])

function findSensitiveKey(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findSensitiveKey(item)
      if (match) return match
    }
    return null
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_CONFIG_KEYS.has(key.toLowerCase())) return key
    const match = findSensitiveKey(child)
    if (match) return match
  }
  return null
}

function validateSteps(
  steps: Array<z.infer<typeof stepSchema>>,
  connections: Array<z.infer<typeof connectionSchema>>
): string | null {
  const keys = new Set<string>()
  const triggerKeys: string[] = []
  for (const step of steps) {
    if (keys.has(step.key)) return `Step key "${step.key}" is duplicated.`
    keys.add(step.key)
    if (step.kind === 'lens' && !step.lens_id) {
      return `Lens step "${step.key}" requires lens_id. Call create_lens first when needed.`
    }
    if (
      step.kind === 'trigger' &&
      (!step.node_type || !triggerType.safeParse(step.node_type).success)
    ) {
      return `Trigger step "${step.key}" requires a supported trigger node_type.`
    }
    if (step.kind === 'trigger') triggerKeys.push(step.key)
    if (step.kind === 'tool' && !step.node_type) {
      return `Tool step "${step.key}" requires a palette node_type.`
    }
    const sensitiveKey = findSensitiveKey({ config: step.config, parameters: step.parameters })
    if (sensitiveKey) {
      return `Step "${step.key}" includes forbidden secret field "${sensitiveKey}". Use connector.connection_ref instead.`
    }
  }
  if (steps.length > 0 && triggerKeys.length !== 1) {
    return `A complete workflow requires exactly one trigger step; received ${triggerKeys.length}.`
  }

  const outgoing = new Map<string, string[]>()
  for (const key of keys) outgoing.set(key, [])
  for (const connection of connections) {
    if (!keys.has(connection.from_step)) {
      return `Connection references unknown from_step "${connection.from_step}".`
    }
    if (!keys.has(connection.to_step)) {
      return `Connection references unknown to_step "${connection.to_step}".`
    }
    if (connection.from_step === connection.to_step) {
      return `Connection cannot link step "${connection.from_step}" to itself.`
    }
    outgoing.get(connection.from_step)?.push(connection.to_step)
  }

  if (triggerKeys.length === 1) {
    const reachable = new Set(triggerKeys)
    const queue = [...triggerKeys]
    for (let index = 0; index < queue.length; index += 1) {
      for (const target of outgoing.get(queue[index]) ?? []) {
        if (reachable.has(target)) continue
        reachable.add(target)
        queue.push(target)
      }
    }
    const unreachable = [...keys].filter((key) => !reachable.has(key))
    if (unreachable.length > 0) {
      return `Every step must be connected from trigger "${triggerKeys[0]}". Unreachable: ${unreachable.join(', ')}.`
    }
  }
  return null
}

export function registerWorkflowCreate(
  server: McpServer,
  sb: SupabaseClient,
  authLenserId?: string
): void {
  registerMcpTool(
    server,
    meta,
    {
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      visibility: z.enum(['public', 'private', 'unlisted']).default('private').optional(),
      lenser_id: p.lenser_id.optional(),
      steps: z
        .array(stepSchema)
        .min(1)
        .max(100)
        .optional()
        .describe(
          'Complete ordered workflow blueprint. Omit only when creating an empty container.'
        ),
      connections: z
        .array(connectionSchema)
        .max(300)
        .default([])
        .optional()
        .describe('Output-to-input mappings using the readable step keys.'),
    },
    async (args) => {
      const t0 = Date.now()
      const lenserId = args.lenser_id ?? authLenserId ?? null
      if (!lenserId) {
        return fail(
          'MISSING_LENSER',
          'lenser_id required. Set LENSERFIGHT_LENSER_ID or pass lenser_id.',
          {},
          TOOL,
          t0
        )
      }
      const steps = args.steps ?? []
      const connections = args.connections ?? []
      const validationError = validateSteps(steps, connections)
      if (validationError) {
        return fail('INVALID_ARGUMENT', validationError, {}, TOOL, t0)
      }

      const nodeIds = new Map(steps.map((step) => [step.key, crypto.randomUUID()]))
      const nodes = steps.map((step, index) => ({
        id: nodeIds.get(step.key)!,
        lens_id: step.kind === 'lens' ? (step.lens_id ?? null) : null,
        version_id: step.kind === 'lens' ? (step.version_id ?? null) : null,
        position_x: 120 + index * 260,
        position_y: 160 + (index % 2) * 120,
        label: step.name,
        ordinal: index,
        config: {
          ...(step.config ?? {}),
          ...(step.node_type ? { node_type: step.node_type } : {}),
          ...(Object.keys(step.parameters ?? {}).length > 0
            ? { param_overrides: step.parameters }
            : {}),
          ...(step.connector
            ? {
                connectorRef: step.connector.connection_ref,
                connectorProvider: step.connector.provider,
                ...(step.connector.capability
                  ? { connectorCapability: step.connector.capability }
                  : {}),
              }
            : {}),
        },
      }))
      const edges = connections.map((connection) => ({
        source_node_id: nodeIds.get(connection.from_step)!,
        target_node_id: nodeIds.get(connection.to_step)!,
        source_output_key: connection.output_key ?? 'output',
        target_param_label: connection.input_parameter,
      }))
      const graphValidation = nodes.length
        ? validateWorkflowGraph({ workflow: {}, nodes, edges })
        : null
      if (graphValidation && !graphValidation.valid) {
        return fail(
          'INVALID_ARGUMENT',
          graphValidation.errors[0]?.message ?? 'Workflow graph is invalid.',
          { errors: graphValidation.errors },
          TOOL,
          t0
        )
      }

      try {
        const data = await workflowService.create(sb, {
          lenser_id: lenserId,
          title: args.title,
          description: args.description ?? null,
          visibility: args.visibility ?? 'private',
          nodes,
          edges,
        })
        return ok(
          {
            ...((data as Record<string, unknown> | null) ?? {}),
            creation_summary: {
              step_count: nodes.length,
              connection_count: edges.length,
              steps: steps.map((step) => ({
                key: step.key,
                name: step.name,
                kind: step.kind,
                node_type: step.node_type,
              })),
            },
            next_steps: nodes.length
              ? [
                  'Call validate_workflow with the returned workflow id.',
                  'Call run_workflow after validation succeeds.',
                ]
              : [
                  'Add steps in the Workflow canvas or call create_workflow again with a complete blueprint.',
                ],
          },
          TOOL,
          t0
        )
      } catch (e) {
        if (e instanceof McpError) return fail(e.code, e.message, e.details, TOOL, t0)
        return fail('DB_ERROR', (e as Error).message, {}, TOOL, t0)
      }
    }
  )
}
