import { lensToSkillPayload } from './lens-to-skill'

import type { LensExportPayload } from './lens'

const baseLens: LensExportPayload = {
  id: 'lens-1',
  slug: 'code-reviewer',
  title: 'Code Reviewer',
  body: 'Reviews a diff for correctness.\n\nBe thorough and cite line numbers.',
  version: 3,
  tags: ['review', 'quality'],
}

describe('lensToSkillPayload', () => {
  it('maps identity fields straight across', () => {
    const skill = lensToSkillPayload(baseLens)

    expect(skill.id).toBe('lens-1')
    expect(skill.slug).toBe('code-reviewer')
    expect(skill.name).toBe('Code Reviewer')
    expect(skill.version).toBe(3)
    expect(skill.tags).toEqual(['review', 'quality'])
  })

  it('derives description and purpose from the opening paragraph', () => {
    const skill = lensToSkillPayload(baseLens)

    expect(skill.description).toBe('Reviews a diff for correctness.')
    expect(skill.purpose).toBe('Reviews a diff for correctness.')
  })

  it('puts the whole prompt body in the workflow section', () => {
    const skill = lensToSkillPayload(baseLens)

    expect(skill.workflow).toContain('Reviews a diff for correctness.')
    expect(skill.workflow).toContain('Be thorough and cite line numbers.')
  })

  it('turns tags into activation keywords and the when-to-use line', () => {
    const skill = lensToSkillPayload(baseLens)

    expect(skill.activation).toEqual({ keywords: ['review', 'quality'] })
    expect(skill.whenToUse).toBe('Use this Skill for tasks involving review, quality.')
  })

  it('renders parameters into the workflow so the Skill stays runnable', () => {
    const skill = lensToSkillPayload({
      ...baseLens,
      parameters: [
        { label: 'Diff', type: 'text', required: true, description: 'The unified diff' },
        { label: 'Tone', type: 'select', required: false, options: [
          { label: 'Blunt', value: 'blunt' },
          { label: 'Gentle', value: 'gentle' },
        ] },
        { label: 'Repo', type: 'text', required: false, placeholder: 'owner/name' },
      ],
    })

    expect(skill.workflow).toContain('**Diff** (`text`, required) — The unified diff')
    expect(skill.workflow).toContain('**Tone** (`select`, optional)')
    expect(skill.workflow).toContain('Options: `blunt`, `gentle`')
    expect(skill.workflow).toContain('Example: `owner/name`')
  })

  it('satisfies the Skill schema when the Lens has no body', () => {
    const skill = lensToSkillPayload({
      id: 'lens-2',
      slug: 'empty',
      title: 'Empty Lens',
      body: null,
      tags: [],
    })

    // name + description are required by the Skill schema.
    expect(skill.name).toBe('Empty Lens')
    expect(skill.description).toBe('Runs the "Empty Lens" Lens, a reusable LenserFight prompt template.')
    expect(skill.workflow).toBeNull()
    expect(skill.activation).toBeUndefined()
    expect(skill.whenToUse).toBe('Use this Skill when you need the "Empty Lens" prompt.')
  })

  it('falls back to the slug when the Lens has no title', () => {
    const skill = lensToSkillPayload({ ...baseLens, title: '   ' })

    expect(skill.name).toBe('code-reviewer')
  })

  it('truncates a long opening paragraph for the frontmatter description', () => {
    const long = 'x'.repeat(400)
    const skill = lensToSkillPayload({ ...baseLens, body: long })

    expect(skill.description.length).toBeLessThanOrEqual(200)
    expect(skill.description.endsWith('…')).toBe(true)
    // The full text still survives in the workflow section.
    expect(skill.workflow).toContain(long)
  })
})
