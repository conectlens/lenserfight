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
    const {
      description,
      visibility,
      node_count,
      battle_count,
      fork_count,
      output_modalities,
      parent_workflow_id,
      parent_workflow_title,
      created_at,
      updated_at,
      nodes,
      edges,
    } = envelope.data
    const lines: string[] = []
    if (description) {
      lines.push(stripHtml(escapeMarkdown(description)))
      lines.push('')
    }
    lines.push('## Metadata')
    lines.push('')
    lines.push('| Field | Value |')
    lines.push('| --- | --- |')
    lines.push(`| ID | \`${envelope.data.id}\` |`)
    if (visibility) lines.push(`| Visibility | \`${visibility}\` |`)
    if (typeof node_count === 'number') lines.push(`| Nodes | \`${node_count}\` |`)
    if (typeof battle_count === 'number') lines.push(`| Battles | \`${battle_count}\` |`)
    if (typeof fork_count === 'number') lines.push(`| Forks | \`${fork_count}\` |`)
    if (created_at) lines.push(`| Created at | \`${created_at}\` |`)
    if (updated_at) lines.push(`| Updated at | \`${updated_at}\` |`)
    if (parent_workflow_id) {
      const parentLabel = parent_workflow_title
        ? `${escapeMarkdown(parent_workflow_title)} (\`${parent_workflow_id}\`)`
        : `\`${parent_workflow_id}\``
      lines.push(`| Forked from | ${parentLabel} |`)
    }
    if (output_modalities && output_modalities.length > 0) {
      const safe = output_modalities.map((m) => escapeMarkdown(m)).map((m) => `\`${m}\``)
      lines.push('')
      lines.push(`**Output modalities:** ${safe.join(' ')}`)
    }

    // Nodes with parameter assignments
    const sortedNodes = nodes && nodes.length > 0
      ? [...nodes].sort((a, b) => a.ordinal - b.ordinal)
      : []
    if (sortedNodes.length > 0) {
      lines.push('')
      lines.push('## Nodes')
      for (const node of sortedNodes) {
        const nodeLabel = node.label
          ? escapeMarkdown(node.label)
          : `Node ${node.ordinal + 1}`
        lines.push('')
        lines.push(`### Node ${node.ordinal + 1} · ${nodeLabel}`)
        lines.push('')
        if (node.lens_id) {
          lines.push(`**Lens ID:** \`${node.lens_id}\``)
          if (node.version_id) lines.push(`**Version ID:** \`${node.version_id}\``)
          lines.push('')
        }
        const config = node.config
        const configEntries = config ? Object.entries(config) : []
        if (configEntries.length > 0) {
          lines.push('**Parameter assignments:**')
          lines.push('')
          lines.push('| Parameter | Value |')
          lines.push('| --- | --- |')
          for (const [key, val] of configEntries) {
            const safeKey = escapeMarkdown(key)
            const safeVal =
              val === null || val === undefined
                ? '_empty_'
                : typeof val === 'object'
                ? `\`${JSON.stringify(val)}\``
                : escapeMarkdown(String(val))
            lines.push(`| \`${safeKey}\` | ${safeVal} |`)
          }
        } else {
          lines.push('_No parameter assignments._')
        }
      }
    }

    // Edge connections (input/output wiring between nodes)
    const nodeIndex = new Map(sortedNodes.map((n) => [n.id, n]))
    const sortedEdges = edges && edges.length > 0 ? edges : []
    if (sortedEdges.length > 0) {
      lines.push('')
      lines.push('## Connections')
      lines.push('')
      lines.push('| From Node | Output Key | → | To Node | Input Parameter |')
      lines.push('| --- | --- | --- | --- | --- |')
      for (const edge of sortedEdges) {
        const src = nodeIndex.get(edge.source_node_id)
        const tgt = nodeIndex.get(edge.target_node_id)
        const srcLabel = src
          ? `Node ${src.ordinal + 1}${src.label ? ` · ${escapeMarkdown(src.label)}` : ''}`
          : `\`${edge.source_node_id}\``
        const tgtLabel = tgt
          ? `Node ${tgt.ordinal + 1}${tgt.label ? ` · ${escapeMarkdown(tgt.label)}` : ''}`
          : `\`${edge.target_node_id}\``
        lines.push(
          `| ${srcLabel} | \`${escapeMarkdown(edge.source_output_key)}\` | → | ${tgtLabel} | \`${escapeMarkdown(edge.target_param_label)}\` |`
        )
      }
    }

    return lines.join('\n')
  }
}
