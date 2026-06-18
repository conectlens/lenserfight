import type { ExportEnvelope, ExportKind } from '@lenserfight/domain/exports'

import { JsonSerializer } from './JsonSerializer'
import { MarkdownSerializerBase } from './MarkdownSerializer'
import { YamlSerializer } from './YamlSerializer'
import { escapeMarkdown, stripHtml } from '../util/markdownEscape'

export interface LensExportParam {
  label: string
  type: string
  required: boolean
  description?: string | null
  placeholder?: string | null
  options?: { label: string; value: string }[] | null
}

export interface LensExportPayload {
  id: string
  slug: string
  title: string
  body?: string | null
  version?: string | number | null
  tags?: string[]
  parameters?: LensExportParam[]
}

const LENS_KIND: ExportKind = 'lens'

export class LensJsonSerializer extends JsonSerializer<LensExportPayload> {
  constructor() {
    super(LENS_KIND)
  }
}

export class LensYamlSerializer extends YamlSerializer<LensExportPayload> {
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
    const { body, version, tags, parameters } = envelope.data
    const lines: string[] = []
    if (version !== undefined && version !== null) {
      lines.push(`**Version:** \`${version}\``)
      lines.push('')
    }
    if (tags && tags.length > 0) {
      const safeTags = tags.map((t) => escapeMarkdown(t)).map((t) => `\`#${t}\``)
      lines.push(`**Tags:** ${safeTags.join(' ')}`)
      lines.push('')
    }
    if (parameters && parameters.length > 0) {
      lines.push('## Parameters')
      lines.push('')
      for (const p of parameters) {
        const req = p.required ? '' : '*(optional)*'
        lines.push(`### \`[[${escapeMarkdown(p.label)}]]\` ${req}`.trim())
        lines.push('')
        lines.push(`- **Type:** \`${p.type}\``)
        if (p.description) lines.push(`- **Description:** ${escapeMarkdown(p.description)}`)
        if (p.placeholder) lines.push(`- **Placeholder:** ${escapeMarkdown(p.placeholder)}`)
        if (p.options && p.options.length > 0) {
          const opts = p.options.map((o) => `\`${escapeMarkdown(o.value)}\``).join(', ')
          lines.push(`- **Options:** ${opts}`)
        }
        lines.push('')
      }
    }
    if (body) {
      lines.push('## Lens body')
      lines.push('')
      lines.push(stripHtml(escapeMarkdown(body)))
      lines.push('')
    }
    return lines.join('\n')
  }
}
