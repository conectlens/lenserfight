import type { ExportEnvelope, ExportKind } from '@lenserfight/domain/exports'

import { JsonSerializer } from './JsonSerializer'
import { MarkdownSerializerBase } from './MarkdownSerializer'
import { YamlSerializer } from './YamlSerializer'
import { escapeMarkdown, stripHtml } from '../util/markdownEscape'

export interface WorkflowNodeExportRecord {
  id: string
  ordinal: number
  label?: string | null
  lens_id?: string | null
  version_id?: string | null
  /** Parameter assignments set for this node (key = param label, value = assigned value). */
  config?: Record<string, unknown> | null
}

export interface WorkflowEdgeExportRecord {
  source_node_id: string
  target_node_id: string
  /** Output key produced by the source node. */
  source_output_key: string
  /** Parameter label on the target node that receives the value. */
  target_param_label: string
}

export interface WorkflowExportPayload {
  id: string
  title: string
  description?: string | null
  visibility?: string
  node_count?: number
  battle_count?: number
  fork_count?: number
  output_modalities?: string[] | null
  parent_workflow_id?: string | null
  parent_workflow_title?: string | null
  created_at?: string
  updated_at?: string
  /** All nodes in the workflow with their parameter assignments. */
  nodes?: WorkflowNodeExportRecord[] | null
  /** All directed edges describing how node outputs feed into node inputs. */
  edges?: WorkflowEdgeExportRecord[] | null
}

const WORKFLOW_KIND: ExportKind = 'workflow'

export class WorkflowJsonSerializer extends JsonSerializer<WorkflowExportPayload> {
  constructor() {
    super(WORKFLOW_KIND)
  }
}

export class WorkflowYamlSerializer extends YamlSerializer<WorkflowExportPayload> {
  constructor() {
    super(WORKFLOW_KIND)
  }
}

export class WorkflowMarkdownSerializer extends MarkdownSerializerBase<WorkflowExportPayload> {
  constructor() {
    super(WORKFLOW_KIND)
  }

  title(envelope: ExportEnvelope<WorkflowExportPayload>): string {
    return envelope.data.title || envelope.data.id
  }

  body(envelope: ExportEnvelope<WorkflowExportPayload>): string {
    const { description, nodes, edges } = envelope.data
    const lines: string[] = []
    if (description) {
      lines.push('## Objective')
      lines.push('')
      lines.push(stripHtml(escapeMarkdown(description)))
      lines.push('')
    }

    const orderedNodes = sortNodesByDependencies(nodes ?? [], edges ?? [])
    const aliases = buildStepAliases(orderedNodes)
    const nodeIndex = new Map(orderedNodes.map((node) => [node.id, node]))
    const incomingByTarget = new Map<string, WorkflowEdgeExportRecord[]>()
    for (const edge of edges ?? []) {
      const incoming = incomingByTarget.get(edge.target_node_id) ?? []
      incoming.push(edge)
      incomingByTarget.set(edge.target_node_id, incoming)
    }

    lines.push('## Execution Plan')
    lines.push('')
    lines.push('Run each step after its listed dependencies are available.')
    lines.push(
      'References such as `{{steps.research-lens.result}}` are readable export aliases, not runtime node IDs.',
    )

    for (const [index, node] of orderedNodes.entries()) {
      const label = stripHtml(escapeMarkdown(node.label || `Step ${index + 1}`))
      const alias = aliases.get(node.id) ?? `step-${index + 1}`
      const incoming = incomingByTarget.get(node.id) ?? []
      const parameters = projectParameters(node.config, aliases)

      lines.push('')
      lines.push(`### Step ${index + 1}: ${label}`)
      lines.push('')
      lines.push(`**Alias:** \`steps.${alias}\``)

      if (incoming.length > 0) {
        lines.push('')
        lines.push('**Inputs**')
        lines.push('')
        for (const edge of incoming) {
          const source = nodeIndex.get(edge.source_node_id)
          const sourceAlias = aliases.get(edge.source_node_id)
          const sourceLabel = source?.label
            ? stripHtml(escapeMarkdown(source.label))
            : 'Unresolved step'
          const reference = sourceAlias
            ? `{{steps.${sourceAlias}.${edge.source_output_key}}}`
            : '{{steps.unresolved.output}}'
          lines.push(
            `- \`${escapeMarkdown(edge.target_param_label)}\` from **${sourceLabel}**: \`${escapeMarkdown(reference)}\``,
          )
        }
      }

      if (parameters.length > 0) {
        lines.push('')
        lines.push('**Parameters**')
        lines.push('')
        for (const [key, value] of parameters) {
          lines.push(`- \`${escapeMarkdown(humanizeParameter(key))}\`: ${renderValue(value)}`)
        }
      }
    }

    return lines.join('\n')
  }
}

const OMITTED_CONFIG_KEYS = new Set([
  'funding_source',
  'key_ref_id',
  'local_key_id',
  'byok_key_ref_id',
  'nodeType',
  'node_type',
])

function sortNodesByDependencies(
  nodes: WorkflowNodeExportRecord[],
  edges: WorkflowEdgeExportRecord[],
): WorkflowNodeExportRecord[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const indegree = new Map(nodes.map((node) => [node.id, 0]))
  const outgoing = new Map<string, string[]>()
  const byOrdinal = (a: WorkflowNodeExportRecord, b: WorkflowNodeExportRecord) =>
    a.ordinal - b.ordinal || a.id.localeCompare(b.id)

  for (const edge of edges) {
    if (!byId.has(edge.source_node_id) || !byId.has(edge.target_node_id)) continue
    indegree.set(edge.target_node_id, (indegree.get(edge.target_node_id) ?? 0) + 1)
    const targets = outgoing.get(edge.source_node_id) ?? []
    targets.push(edge.target_node_id)
    outgoing.set(edge.source_node_id, targets)
  }

  for (const targets of outgoing.values()) {
    targets.sort((leftId, rightId) => {
      const left = byId.get(leftId)
      const right = byId.get(rightId)
      if (!left || !right) return leftId.localeCompare(rightId)
      return byOrdinal(left, right)
    })
  }

  const ready = nodes.filter((node) => indegree.get(node.id) === 0).sort(byOrdinal)
  const ordered: WorkflowNodeExportRecord[] = []
  let readyIndex = 0

  while (readyIndex < ready.length) {
    const node = ready[readyIndex]
    readyIndex += 1
    if (!node) break
    ordered.push(node)
    for (const targetId of outgoing.get(node.id) ?? []) {
      const nextIndegree = (indegree.get(targetId) ?? 0) - 1
      indegree.set(targetId, nextIndegree)
      if (nextIndegree === 0) {
        const target = byId.get(targetId)
        if (target) ready.push(target)
      }
    }
  }

  if (ordered.length === nodes.length) return ordered
  const included = new Set(ordered.map((node) => node.id))
  return [...ordered, ...nodes.filter((node) => !included.has(node.id)).sort(byOrdinal)]
}

function buildStepAliases(nodes: WorkflowNodeExportRecord[]): Map<string, string> {
  const aliases = new Map<string, string>()
  const counts = new Map<string, number>()

  for (const [index, node] of nodes.entries()) {
    const base = slugify(node.label || `step-${index + 1}`) || `step-${index + 1}`
    const count = (counts.get(base) ?? 0) + 1
    counts.set(base, count)
    aliases.set(node.id, count === 1 ? base : `${base}-${count}`)
  }

  return aliases
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function projectParameters(
  config: Record<string, unknown> | null | undefined,
  aliases: Map<string, string>,
): [string, unknown][] {
  if (!config) return []
  const projected: [string, unknown][] = []
  const overrides = parseOverrides(config.param_overrides)

  for (const [key, value] of Object.entries(config)) {
    if (key === 'param_overrides' || OMITTED_CONFIG_KEYS.has(key) || isEmpty(value)) continue
    projected.push([key, replaceRuntimeReferences(value, aliases)])
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (OMITTED_CONFIG_KEYS.has(key) || isEmpty(value)) continue
    projected.push([key, replaceRuntimeReferences(value, aliases)])
  }

  return projected
}

function parseOverrides(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value !== 'string' || value.trim() === '') return {}
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
}

function replaceRuntimeReferences(value: unknown, aliases: Map<string, string>): unknown {
  if (typeof value === 'string') {
    return value.replace(
      /\[\[([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_.[\]]+)\]\]/g,
      (_match, nodeId: string, fieldPath: string) => {
        const alias = aliases.get(nodeId) ?? 'unresolved'
        return `{{steps.${alias}.${fieldPath}}}`
      },
    )
  }
  if (Array.isArray(value)) return value.map((item) => replaceRuntimeReferences(item, aliases))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceRuntimeReferences(item, aliases)]),
    )
  }
  return value
}

function humanizeParameter(key: string): string {
  if (key === 'model_id') return 'Model'
  return key
    .replace(/^__/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function renderValue(value: unknown): string {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value)
  const safe = stripHtml(escapeMarkdown(serialized ?? String(value)))
  if (safe.includes('\n')) return `\n\n\`\`\`text\n${safe}\n\`\`\``
  return `\`${safe.replace(/`/g, '\\`')}\``
}
