import type { LensExportPayload, LensExportParam } from './lens'
import type { SkillExportPayload } from './skill'

/**
 * Maps a Lens onto the agentskills.io Skill shape.
 *
 * A Lens is a reusable prompt template; a Skill is that same intent expressed
 * in the SKILL.md contract. The three required SKILL.md sections are filled
 * from what a Lens actually carries:
 *
 *   - `workflow`  ← the prompt body, plus its parameters. This is the part an
 *                   agent executes, so the parameters belong here rather than
 *                   being dropped — a Skill that omits its inputs is not
 *                   runnable.
 *   - `purpose`   ← the opening paragraph of the body, which is where a Lens
 *                   author conventionally states intent.
 *   - `whenToUse` ← the tags, which are the only "when does this apply"
 *                   signal a Lens carries.
 *
 * `name` and `description` are required by the Skill schema, so both fall back
 * to derived values rather than emitting an invalid document.
 */

/** Keeps the frontmatter `description` to a single readable line. */
const DESCRIPTION_MAX = 200

function firstParagraph(body?: string | null): string | null {
  if (!body) return null
  const trimmed = body.trim()
  if (!trimmed) return null
  const [paragraph] = trimmed.split(/\n\s*\n/)
  return paragraph?.trim() || null
}

function truncate(text: string, max: number): string {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= max) return collapsed
  return `${collapsed.slice(0, max - 1).trimEnd()}…`
}

function renderParameters(parameters?: LensExportParam[]): string | null {
  if (!parameters || parameters.length === 0) return null

  const lines = parameters.map((p) => {
    const requirement = p.required ? 'required' : 'optional'
    const bits = [`- **${p.label}** (\`${p.type}\`, ${requirement})`]
    if (p.description) bits.push(` — ${p.description}`)
    const detail = bits.join('')

    if (p.options && p.options.length > 0) {
      const choices = p.options.map((o) => `\`${o.value}\``).join(', ')
      return `${detail}\n  - Options: ${choices}`
    }
    if (p.placeholder) {
      return `${detail}\n  - Example: \`${p.placeholder}\``
    }
    return detail
  })

  return ['Gather these inputs before running the prompt:', '', ...lines].join('\n')
}

export function lensToSkillPayload(lens: LensExportPayload): SkillExportPayload {
  const name = lens.title?.trim() || lens.slug
  const intro = firstParagraph(lens.body)
  const tags = lens.tags?.filter(Boolean) ?? []

  const description = intro
    ? truncate(intro, DESCRIPTION_MAX)
    : `Runs the "${name}" Lens, a reusable LenserFight prompt template.`

  const parameterBlock = renderParameters(lens.parameters)
  const promptBody = lens.body?.trim() || null
  const workflow = [promptBody, parameterBlock].filter(Boolean).join('\n\n') || null

  const whenToUse =
    tags.length > 0
      ? `Use this Skill for tasks involving ${tags.join(', ')}.`
      : `Use this Skill when you need the "${name}" prompt.`

  return {
    id: lens.id,
    slug: lens.slug,
    name,
    description,
    version: lens.version ?? null,
    tags,
    activation: tags.length > 0 ? { keywords: tags } : undefined,
    purpose: intro ?? description,
    whenToUse,
    workflow,
  }
}
