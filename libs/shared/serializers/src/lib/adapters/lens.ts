import type { ExportEnvelope, ExportKind } from '@lenserfight/domain/exports'

import { JsonSerializer } from './JsonSerializer'
import { MarkdownSerializerBase } from './MarkdownSerializer'
import { escapeMarkdown, stripHtml } from '../util/markdownEscape'

export interface LensExportPayload {
  id: string
  slug: string
  title: string
  body?: string | null
  version?: string | number | null
  tags?: string[]
  parameters?: Record<string, unknown>
}

const LENS_KIND: ExportKind = 'lens'

export class LensJsonSerializer extends JsonSerializer<LensExportPayload> {
  constructor() {
    super(LENS_KIND)
  }
}

export class LensMarkdownSerializer extends MarkdownSerializerBase<LensExportPayload> {
  constructor() {
    super(LENS_KIND)
  }

  title(envelope: ExportEnvelope<LensExportPayload>): string {
    return envelope.data.title || envelope.data.slug
  }

  body(envelope: ExportEnvelope<LensExportPayload>): string {
    const { body, version, tags } = envelope.data
    const lines: string[] = []
    if (version !== undefined && version !== null) {
      lines.push(`**Version:** \`${version}\``)
      lines.push('')
    }
    if (body) {
      lines.push('## Lens body')
      lines.push('')
      lines.push(stripHtml(escapeMarkdown(body)))
      lines.push('')
    }
    if (tags && tags.length > 0) {
      const safeTags = tags.map((t) => escapeMarkdown(t)).map((t) => `\`#${t}\``)
      lines.push(`**Tags:** ${safeTags.join(' ')}`)
    }
    return lines.join('\n')
  }
}
