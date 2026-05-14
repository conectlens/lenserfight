import type {
  ExportEnvelope,
  ExportFormat,
  ExportKind,
  ValidationResult,
} from '@lenserfight/domain/exports'

import type { Serializer } from '../Serializer'
import { escapeMarkdown, stripHtml, yamlScalar } from '../util/markdownEscape'

/**
 * Markdown serializer (community / GitHub flavor).
 *
 * Subclasses provide the body. The base owns: YAML frontmatter shape,
 * footer (checksum + redactions), and string sanitization. This keeps
 * format invariants in one place (Information Expert).
 */
export abstract class MarkdownSerializerBase<T> implements Serializer<T> {
  readonly format: ExportFormat = 'markdown'
  readonly mediaType = 'text/markdown'
  readonly extension = 'md'

  constructor(readonly kind: ExportKind) {}

  abstract title(envelope: ExportEnvelope<T>): string
  abstract body(envelope: ExportEnvelope<T>): string

  async serialize(envelope: ExportEnvelope<T>): Promise<string> {
    const fm = this.frontmatter(envelope)
    const safeTitle = stripHtml(escapeMarkdown(this.title(envelope)))
    const body = this.body(envelope)
    const footer = this.footer(envelope)
    return `${fm}\n# ${safeTitle}\n\n${body}\n\n${footer}\n`
  }

  async validate(output: string): Promise<ValidationResult> {
    const issues: { path: string; message: string }[] = []
    if (!output.startsWith('---\n')) {
      issues.push({ path: 'frontmatter', message: 'must begin with --- block' })
    }
    if (!output.includes('\n---\n')) {
      issues.push({ path: 'frontmatter', message: 'must close with --- block' })
    }
    if (!/<!--\s*checksum:\s*[0-9a-f]{64}\s*-->/.test(output)) {
      issues.push({ path: 'footer', message: 'missing checksum comment in footer' })
    }
    return { ok: issues.length === 0, issues }
  }

  protected frontmatter(envelope: ExportEnvelope<T>): string {
    const lines: string[] = ['---']
    lines.push(`schema: ${yamlScalar(envelope.schema)}`)
    lines.push(`schemaVersion: ${yamlScalar(envelope.schemaVersion)}`)
    lines.push(`kind: ${yamlScalar(envelope.kind)}`)
    lines.push(`visibility: ${yamlScalar(envelope.visibility)}`)
    lines.push(`generatedAt: ${yamlScalar(envelope.generatedAt)}`)
    lines.push(`generatedBy:`)
    lines.push(`  via: ${yamlScalar(envelope.generatedBy.via)}`)
    lines.push(`  userId: ${yamlScalar(envelope.generatedBy.userId)}`)
    lines.push(`source:`)
    lines.push(`  host: ${yamlScalar(envelope.source.host)}`)
    lines.push(`  tenantId: ${yamlScalar(envelope.source.tenantId)}`)
    if (envelope.source.commit) lines.push(`  commit: ${yamlScalar(envelope.source.commit)}`)
    lines.push(`checksum: ${yamlScalar(envelope.checksum)}`)
    lines.push('---')
    return lines.join('\n')
  }

  protected footer(envelope: ExportEnvelope<T>): string {
    const lines: string[] = []
    lines.push('---')
    lines.push('')
    if (envelope.redactions.length > 0) {
      lines.push(`> **Redactions applied** (\`${envelope.visibility}\` view):`)
      for (const path of envelope.redactions) lines.push(`> - \`${path}\``)
      lines.push('')
    }
    lines.push(`<!-- checksum: ${envelope.checksum} -->`)
    lines.push(`<!-- schema: ${envelope.schema} -->`)
    return lines.join('\n')
  }
}
