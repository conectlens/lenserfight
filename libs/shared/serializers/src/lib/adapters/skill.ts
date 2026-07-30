import type { ExportEnvelope, ExportKind } from '@lenserfight/domain/exports'

import { JsonSerializer } from './JsonSerializer'
import { MarkdownSerializerBase } from './MarkdownSerializer'
import { YamlSerializer } from './YamlSerializer'
import { escapeMarkdown, stripHtml, yamlScalar } from '../util/markdownEscape'

/**
 * Skill export payload.
 *
 * Mirrors the spec-governance Skill schema
 * (`libs/domain/spec-governance/src/lib/schemas/skill.schema.json`):
 *   - required: `name`, `description` (`kind` is supplied by the envelope)
 *   - `activation` mirrors the schema's activation object
 *   - `purpose` / `whenToUse` / `workflow` back the required SKILL.md
 *     sections declared in `SPEC_KIND_META.Skill.requiredSections`
 *     (`Purpose`, `When To Use`, `Workflow`).
 */
export interface SkillActivation {
  keywords?: string[]
  requires_tools?: string[]
}

export interface SkillExportPayload {
  id?: string
  slug?: string
  name: string
  description: string
  version?: string | number | null
  tags?: string[]
  activation?: SkillActivation
  purpose?: string | null
  whenToUse?: string | null
  workflow?: string | null
}

const SKILL_KIND: ExportKind = 'skill'

export class SkillJsonSerializer extends JsonSerializer<SkillExportPayload> {
  constructor() {
    super(SKILL_KIND)
  }
}

export class SkillYamlSerializer extends YamlSerializer<SkillExportPayload> {
  constructor() {
    super(SKILL_KIND)
  }
}

export class SkillMarkdownSerializer extends MarkdownSerializerBase<SkillExportPayload> {
  constructor() {
    super(SKILL_KIND)
  }

  title(envelope: ExportEnvelope<SkillExportPayload>): string {
    return envelope.data.name || envelope.data.slug || 'Skill'
  }

  /**
   * SKILL.md convention: `name` and `description` live in the frontmatter
   * alongside the envelope-level `kind`. Splice them into the base block
   * before its closing `---`.
   */
  protected override frontmatter(envelope: ExportEnvelope<SkillExportPayload>): string {
    const base = super.frontmatter(envelope)
    const extra = [
      `name: ${yamlScalar(envelope.data.name)}`,
      `description: ${yamlScalar(envelope.data.description)}`,
    ].join('\n')
    const closing = base.lastIndexOf('\n---')
    return `${base.slice(0, closing)}\n${extra}${base.slice(closing)}`
  }

  body(envelope: ExportEnvelope<SkillExportPayload>): string {
    const d = envelope.data
    const lines: string[] = []

    if (d.description) {
      lines.push(stripHtml(escapeMarkdown(d.description)))
      lines.push('')
    }
    if (d.version !== undefined && d.version !== null) {
      lines.push(`**Version:** \`${d.version}\``)
      lines.push('')
    }
    if (d.tags && d.tags.length > 0) {
      const safeTags = d.tags.map((t) => escapeMarkdown(t)).map((t) => `\`#${t}\``)
      lines.push(`**Tags:** ${safeTags.join(' ')}`)
      lines.push('')
    }

    const keywords = d.activation?.keywords
    const requiresTools = d.activation?.requires_tools
    if ((keywords && keywords.length > 0) || (requiresTools && requiresTools.length > 0)) {
      lines.push('## Activation')
      lines.push('')
      if (keywords && keywords.length > 0) {
        const safe = keywords.map((k) => `\`${escapeMarkdown(k)}\``).join(' ')
        lines.push(`- **Keywords:** ${safe}`)
      }
      if (requiresTools && requiresTools.length > 0) {
        const safe = requiresTools.map((t) => `\`${escapeMarkdown(t)}\``).join(' ')
        lines.push(`- **Requires tools:** ${safe}`)
      }
      lines.push('')
    }

    // Required SKILL.md sections (spec-governance SPEC_KIND_META.Skill).
    this.section(lines, 'Purpose', d.purpose)
    this.section(lines, 'When To Use', d.whenToUse)
    this.section(lines, 'Workflow', d.workflow)

    return lines.join('\n').trimEnd()
  }

  private section(lines: string[], heading: string, content?: string | null): void {
    lines.push(`## ${heading}`)
    lines.push('')
    lines.push(content ? stripHtml(escapeMarkdown(content)) : '_Not specified._')
    lines.push('')
  }
}
