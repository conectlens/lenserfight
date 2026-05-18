import type { ExportEnvelope, ExportKind } from '@lenserfight/domain/exports'

import { JsonSerializer } from './JsonSerializer'
import { MarkdownSerializerBase } from './MarkdownSerializer'
import { YamlSerializer } from './YamlSerializer'
import { escapeMarkdown, stripHtml } from '../util/markdownEscape'

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
    return lines.join('\n')
  }
}
