import type { ExportEnvelope, ExportKind } from '@lenserfight/domain/exports'

import { JsonSerializer } from './JsonSerializer'
import { MarkdownSerializerBase } from './MarkdownSerializer'
import { escapeMarkdown, stripHtml } from '../util/markdownEscape'

/**
 * Minimal Battle data shape that the export feature consumes. The full
 * battle type lives in libs/domain/battles (not yet defined as a typed
 * export here); the export layer only relies on the duck-typed subset
 * below, which keeps the dependency direction safe.
 *
 * GRASP: Information Expert. Battle knows how to render itself; later
 * the per-entity serializers will move under libs/domain/battles/src/exports.
 * For EX-1 they live next to the registry while the Battle domain lib is empty.
 */
export interface BattleExportPayload {
  id: string
  slug: string
  title: string
  description?: string | null
  state?: string | null
  createdAt?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

const BATTLE_KIND: ExportKind = 'battle'

export class BattleJsonSerializer extends JsonSerializer<BattleExportPayload> {
  constructor() {
    super(BATTLE_KIND)
  }
}

export class BattleMarkdownSerializer extends MarkdownSerializerBase<BattleExportPayload> {
  constructor() {
    super(BATTLE_KIND)
  }

  title(envelope: ExportEnvelope<BattleExportPayload>): string {
    return envelope.data.title || envelope.data.slug
  }

  body(envelope: ExportEnvelope<BattleExportPayload>): string {
    const { description, tags, state, createdAt } = envelope.data
    const lines: string[] = []
    if (description) {
      lines.push(stripHtml(escapeMarkdown(description)))
      lines.push('')
    }
    lines.push('## Metadata')
    lines.push('')
    lines.push('| Field | Value |')
    lines.push('| --- | --- |')
    lines.push(`| State | \`${state ?? 'unknown'}\` |`)
    if (createdAt) lines.push(`| Created at | \`${createdAt}\` |`)
    lines.push(`| Slug | \`${envelope.data.slug}\` |`)
    if (tags && tags.length > 0) {
      const safeTags = tags.map((t) => escapeMarkdown(t)).map((t) => `\`#${t}\``)
      lines.push('')
      lines.push(`**Tags:** ${safeTags.join(' ')}`)
    }
    return lines.join('\n')
  }
}
