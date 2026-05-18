/**
 * Dry Run / Test Mode utilities for Workflow Studio.
 *
 * Responsibilities:
 *  - SIDE_EFFECT_NODE_TYPES: the set of node types that must be mocked during dry run
 *  - createDryRunMockRunner: factory for a no-op runner that returns a safe mock result
 *  - validateDryRunPlan: pre-run structural validation (no trigger node required)
 */
import { validateWorkflow } from '@lenserfight/infra/execution'

import type { WorkflowEdgeRecord, WorkflowNodeRecord } from '@lenserfight/data/repositories'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult, WorkflowNodeType } from '@lenserfight/infra/execution'

// ── Side-effect policy ────────────────────────────────────────────────────────

/**
 * Node types that cause irreversible external side effects.
 *
 * In dry-run mode these are mocked with a completed result and a warning.
 * Read-only nodes (github_read, notion_read, google_sheets_read, kv_store_read,
 * file_reader, object_storage_download, memory_read) are intentionally excluded —
 * they are safe to execute for real.
 *
 * supabase_query and sql_query are conservatively mocked because the runner
 * layer cannot distinguish SELECT from INSERT/UPDATE/DELETE at type resolution time.
 */
export const SIDE_EFFECT_NODE_TYPES: ReadonlySet<string> = new Set([
  'email_send',
  'slack_notify',
  'discord_notify',
  'telegram_notify',
  'push_notification',
  'sms_send',
  'github_issue_create',
  'github_pr_review',
  'notion_write',
  'google_sheets_write',
  'calendar_create',
  'linear_issue_create',
  'jira_issue_create',
  'webhook_sender',
  'kv_store_write',
  'file_writer',
  'object_storage_upload',
  'supabase_query',
  'sql_query',
  'memory_write',
])

/** Returns true when the given node type should be mocked in dry-run mode. */
export function isSideEffectNodeType(nodeType: string | null | undefined): boolean {
  return !!nodeType && SIDE_EFFECT_NODE_TYPES.has(nodeType)
}

// ── Mock runner factory ───────────────────────────────────────────────────────

/**
 * Creates an INodeRunner that immediately completes without calling any external
 * service. The output_data contains `_dryRunWarning` and `_dryRunMocked = true`
 * so the canvas sync can surface a warning indicator on the node.
 */
export function createDryRunMockRunner(nodeType: string): INodeRunner {
  return {
    nodeType: nodeType as WorkflowNodeType,
    async execute(_: NodeRunnerContext): Promise<NodeRunnerResult> {
      return {
        output: {
          mediaType: 'text',
          text: `[Dry Run] ${nodeType} was skipped — side effects are not executed in dry-run mode.`,
          durationMs: 0,
          data: {
            _dryRunWarning: `${nodeType} skipped (dry run — side effects not executed)`,
            _dryRunMocked: true,
          },
        },
      }
    },
  }
}

// ── Pre-run validation ────────────────────────────────────────────────────────

export interface DryRunValidationResult {
  ok: boolean
  errors: string[]
  /** Non-blocking notes — dry run proceeds but user should see these. */
  warnings: string[]
}

/**
 * Validates a workflow before a dry run.
 *
 * Differences from normal run validation:
 * - requireTriggerNode = false (dry run can test partial DAGs mid-build)
 * - Side-effecting nodes produce a warning, not an error
 * - Model / funding-source requirements are not checked (EchoProvider is used)
 */
export function validateDryRunPlan(
  nodes: WorkflowNodeRecord[],
  edges: WorkflowEdgeRecord[],
): DryRunValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (nodes.length === 0) {
    errors.push('No nodes in this workflow.')
    return { ok: false, errors, warnings }
  }

  const struct = validateWorkflow(
    nodes.map((n) => {
      const cfg = (n.config ?? null) as Record<string, unknown> | null
      return {
        id: n.id,
        lensId: n.lens_id ?? undefined,
        versionId: n.version_id ?? null,
        config: cfg,
        kind: cfg?.['node_type'] as string | undefined,
      }
    }),
    edges.map((e) => ({
      id: e.id,
      sourceNodeId: e.source_node_id,
      targetNodeId: e.target_node_id,
      sourceOutputKey: e.source_output_key,
      targetParamLabel: e.target_param_label,
      condition: e.condition as
        | { type: 'equals' | 'contains' | 'present' | 'truthy'; value?: unknown }
        | null
        | undefined,
    })),
    { requireTriggerNode: false },
  )

  if (!struct.ok) {
    errors.push(...struct.errors.map((e) => e.message))
  }

  // Warn about side-effecting nodes that will be mocked
  const sideEffectNodes = nodes.filter((n) => {
    const nodeType = (n.config as Record<string, unknown> | null)?.['node_type'] as
      | string
      | undefined
    return isSideEffectNodeType(nodeType)
  })

  if (sideEffectNodes.length > 0) {
    const names = sideEffectNodes
      .map((n) => n.label ?? n.id.slice(0, 8))
      .join(', ')
    warnings.push(
      `${sideEffectNodes.length} side-effect node${sideEffectNodes.length === 1 ? '' : 's'} will be mocked (no external calls): ${names}`,
    )
  }

  return { ok: errors.length === 0, errors, warnings }
}
