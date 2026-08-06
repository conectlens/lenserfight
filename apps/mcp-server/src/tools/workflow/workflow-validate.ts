import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SupabaseClient } from '@supabase/supabase-js'

import { McpError } from '../../services/mcp-error.js'
import { workflowService, type WorkflowGraph } from '../../services/workflow.service.js'
import { fail, ok } from '../../types.js'
import { registerMcpTool } from '../register-tool.js'
import { getToolMeta } from '../tool-metadata.js'
import { p } from '../tool-params.js'
import { TRIGGER_NODE_TYPE_SET as TRIGGER_TYPES } from './workflow-trigger-node-types.js'

const meta = getToolMeta('validate_workflow')
const TOOL = meta.name

interface ValidationIssue {
  code: string
  message: string
  node_id?: string
  edge_id?: string
}

interface ValidatedNode {
  id: string
  name: string
  kind: 'trigger' | 'lens' | 'tool' | 'unknown'
  configured_parameters: string[]
  wired_parameters: string[]
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function getNodeKind(node: Record<string, unknown>): ValidatedNode['kind'] {
  const config = asRecord(node.config)
  const nodeType = asNonEmptyString(config.node_type) ?? asNonEmptyString(config.nodeType)
  if (nodeType && TRIGGER_TYPES.has(nodeType)) return 'trigger'
  if (node.lens_id) return 'lens'
  if (nodeType) return 'tool'
  return 'unknown'
}

function getNodeName(node: Record<string, unknown>, index: number): string {
  return (
    asNonEmptyString(node.label) ??
    asNonEmptyString(node.title) ??
    asNonEmptyString(asRecord(node.config).node_type) ??
    `Step ${index + 1}`
  )
}

/** Validate a workflow graph without executing it or making additional API calls. */
export function validateWorkflowGraph(graph: WorkflowGraph) {
  const rawNodes = Array.isArray(graph.nodes) ? graph.nodes : []
  const rawEdges = Array.isArray(graph.edges) ? graph.edges : []
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []
  const nodeById = new Map<string, { node: Record<string, unknown>; summary: ValidatedNode }>()

  rawNodes.forEach((value, index) => {
    const node = asRecord(value)
    const id = asNonEmptyString(node.id)
    if (!id) {
      errors.push({ code: 'NODE_ID_MISSING', message: `Step ${index + 1} has no node id.` })
      return
    }
    if (nodeById.has(id)) {
      errors.push({
        code: 'NODE_ID_DUPLICATE',
        message: `Node id ${id} is duplicated.`,
        node_id: id,
      })
      return
    }

    const config = asRecord(node.config)
    const overrides = asRecord(config.param_overrides)
    const kind = getNodeKind(node)
    if (kind === 'unknown') {
      errors.push({
        code: 'NODE_KIND_UNKNOWN',
        message: `Node ${getNodeName(node, index)} has neither a Lens nor a supported node type.`,
        node_id: id,
      })
    }

    nodeById.set(id, {
      node,
      summary: {
        id,
        name: getNodeName(node, index),
        kind,
        configured_parameters: Object.keys(overrides).sort(),
        wired_parameters: [],
      },
    })
  })

  if (nodeById.size === 0) {
    errors.push({
      code: 'WORKFLOW_EMPTY',
      message: 'Add at least one node before running the workflow.',
    })
  }

  const outgoing = new Map<string, string[]>()
  const indegree = new Map<string, number>()
  for (const id of nodeById.keys()) {
    outgoing.set(id, [])
    indegree.set(id, 0)
  }

  rawEdges.forEach((value, index) => {
    const edge = asRecord(value)
    const edgeId = asNonEmptyString(edge.id) ?? `edge-${index + 1}`
    const sourceId = asNonEmptyString(edge.source_node_id)
    const targetId = asNonEmptyString(edge.target_node_id)
    const targetParam = asNonEmptyString(edge.target_param_label)

    if (!sourceId || !nodeById.has(sourceId)) {
      errors.push({
        code: 'EDGE_SOURCE_MISSING',
        message: `Connection ${edgeId} references a missing source node.`,
        edge_id: edgeId,
      })
    }
    if (!targetId || !nodeById.has(targetId)) {
      errors.push({
        code: 'EDGE_TARGET_MISSING',
        message: `Connection ${edgeId} references a missing target node.`,
        edge_id: edgeId,
      })
    }
    if (!targetParam) {
      errors.push({
        code: 'EDGE_PARAMETER_MISSING',
        message: `Connection ${edgeId} does not name a target parameter.`,
        edge_id: edgeId,
      })
    }

    if (sourceId && targetId && nodeById.has(sourceId) && nodeById.has(targetId)) {
      outgoing.get(sourceId)?.push(targetId)
      indegree.set(targetId, (indegree.get(targetId) ?? 0) + 1)
      if (targetParam) nodeById.get(targetId)?.summary.wired_parameters.push(targetParam)
    }
  })

  const rootNodeIds = new Set([...nodeById.keys()].filter((id) => indegree.get(id) === 0))
  const queue = [...rootNodeIds]
  const executionOrder: string[] = []
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index]
    executionOrder.push(id)
    for (const targetId of outgoing.get(id) ?? []) {
      const nextIndegree = (indegree.get(targetId) ?? 0) - 1
      indegree.set(targetId, nextIndegree)
      if (nextIndegree === 0) queue.push(targetId)
    }
  }

  if (executionOrder.length !== nodeById.size) {
    errors.push({
      code: 'WORKFLOW_CYCLE',
      message: 'The workflow contains a cycle and cannot be executed in dependency order.',
    })
  }

  const triggerCount = [...nodeById.values()].filter(
    ({ summary }) => summary.kind === 'trigger'
  ).length
  if (triggerCount === 0 && nodeById.size > 0) {
    warnings.push({
      code: 'TRIGGER_MISSING',
      message:
        'No explicit trigger node was found. Add a trigger if this workflow should start from the canvas.',
    })
  } else if (triggerCount > 1) {
    warnings.push({
      code: 'MULTIPLE_TRIGGERS',
      message: `The workflow has ${triggerCount} trigger nodes. Confirm that every trigger is intentional.`,
    })
  }

  const nodes = [...nodeById.values()].map(({ summary }) => ({
    ...summary,
    wired_parameters: [...new Set(summary.wired_parameters)].sort(),
  }))
  const orderedNodes = executionOrder
    .map((id) => nodes.find((node) => node.id === id))
    .filter((node): node is ValidatedNode => Boolean(node))

  return {
    valid: errors.length === 0,
    run_ready: errors.length === 0 && nodeById.size > 0,
    errors,
    warnings,
    execution_order: orderedNodes,
    root_nodes: nodes.filter((node) => rootNodeIds.has(node.id)),
    nodes,
  }
}

export function registerWorkflowValidate(server: McpServer, sb: SupabaseClient): void {
  registerMcpTool(server, meta, { workflow_id: p.workflow_id }, async ({ workflow_id }) => {
    const t0 = Date.now()
    try {
      const graph = await workflowService.getGraph(sb, workflow_id)
      if (!graph) {
        return fail('NOT_FOUND', `Workflow ${workflow_id} not found or not visible`, {}, TOOL, t0)
      }
      return ok(validateWorkflowGraph(graph), TOOL, t0)
    } catch (error) {
      if (error instanceof McpError) {
        return fail(error.code, error.message, error.details, TOOL, t0)
      }
      return fail('DB_ERROR', (error as Error).message, {}, TOOL, t0)
    }
  })
}
