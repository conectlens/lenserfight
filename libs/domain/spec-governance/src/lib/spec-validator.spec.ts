import { describe, expect, it } from 'vitest'
import { validateSpec, type SpecValidationInput } from './spec-validator'

function makeInput(overrides: Partial<SpecValidationInput> = {}): SpecValidationInput {
  return {
    frontmatter: { kind: 'lens', name: 'Test', description: 'A test.' },
    body: '# Purpose\nTest\n\n# Prompt\nTest\n\n# Inputs\nTest\n\n# Outputs\nTest\n',
    sections: { Purpose: 'Test', Prompt: 'Test', Inputs: 'Test', Outputs: 'Test' },
    ...overrides,
  }
}

describe('spec-validator', () => {
  describe('full three-layer validation', () => {
    it('returns empty array for fully valid lens', () => {
      const issues = validateSpec(makeInput({
        frontmatter: {
          kind: 'lens',
          schema_version: 1,
          id: 'lens_test',
          name: 'Test',
          description: 'A test.',
          apiVersion: 'lenserfight.dev/v1alpha1',
        },
      }))
      expect(issues).toEqual([])
    })

    it('reports missing frontmatter fields via AJV (Layer 1)', () => {
      const issues = validateSpec(makeInput({
        frontmatter: {
          kind: 'lens',
          schema_version: 1,
          id: 'lens_test',
          apiVersion: 'lenserfight.dev/v1alpha1',
        },
      }))
      const paths = issues.map((i) => i.path)
      expect(paths).toContain('name')
      expect(paths).toContain('description')
    })

    it('reports missing sections (Layer 2)', () => {
      const issues = validateSpec(makeInput({
        frontmatter: {
          kind: 'lens',
          schema_version: 1,
          id: 'lens_test',
          name: 'Test',
          description: 'A test.',
          apiVersion: 'lenserfight.dev/v1alpha1',
        },
        sections: { Purpose: 'Test' },
      }))
      const sectionIssues = issues.filter((i) => i.path.startsWith('section:'))
      expect(sectionIssues.length).toBe(3) // Prompt, Inputs, Outputs missing
    })

    it('reports battle participant issues (Layer 3)', () => {
      const issues = validateSpec(makeInput({
        frontmatter: {
          kind: 'battle',
          schema_version: 1,
          id: 'battle_test',
          name: 'Test',
          description: 'A test.',
          apiVersion: 'lenserfight.dev/v1alpha1',
          participants: [{ invalid: true }],
        },
        sections: { Purpose: 'T', Participants: 'T', Evaluation: 'T', Report: 'T' },
      }))
      const participantIssue = issues.find((i) => i.path.includes('participants'))
      expect(participantIssue).toBeDefined()
    })

    it('reports disclaimer issues for legal content (Layer 3)', () => {
      const issues = validateSpec(makeInput({
        frontmatter: {
          kind: 'lens',
          schema_version: 1,
          id: 'lens_legal',
          name: 'Legal Brief',
          description: 'A legal brief template.',
          apiVersion: 'lenserfight.dev/v1alpha1',
          tags: ['legal'],
        },
      }))
      const disclaimerIssue = issues.find((i) => i.path === 'disclaimer.legal')
      expect(disclaimerIssue).toBeDefined()
    })
  })

  describe('options', () => {
    it('skipSections skips section checks', () => {
      const issues = validateSpec(
        makeInput({
          frontmatter: {
            kind: 'lens',
            schema_version: 1,
            id: 'lens_test',
            name: 'Test',
            description: 'A test.',
            apiVersion: 'lenserfight.dev/v1alpha1',
          },
          sections: {},
        }),
        { skipSections: true },
      )
      const sectionIssues = issues.filter((i) => i.path.startsWith('section:'))
      expect(sectionIssues).toEqual([])
    })

    it('skipSemanticChecks skips Layer 3 validators', () => {
      const issues = validateSpec(
        makeInput({
          frontmatter: {
            kind: 'battle',
            schema_version: 1,
            id: 'battle_test',
            name: 'Test',
            description: 'A test.',
            apiVersion: 'lenserfight.dev/v1alpha1',
          },
          sections: { Purpose: 'T', Participants: 'T', Evaluation: 'T', Report: 'T' },
        }),
        { skipSemanticChecks: true },
      )
      // No battle reference warnings without semantic checks
      const battleIssue = issues.find((i) => i.path === 'battle')
      expect(battleIssue).toBeUndefined()
    })

    it('minimalUnit skips id/schema_version/sections checks', () => {
      const issues = validateSpec(
        makeInput({
          frontmatter: { kind: 'lens', name: 'Test', description: 'A test.' },
          sections: {},
        }),
        { minimalUnit: true },
      )
      const idIssue = issues.find((i) => i.path === 'id')
      const svIssue = issues.find((i) => i.path === 'schema_version')
      const avIssue = issues.find((i) => i.path === 'apiVersion')
      const sectionIssues = issues.filter((i) => i.path.startsWith('section:'))
      expect(idIssue).toBeUndefined()
      expect(svIssue).toBeUndefined()
      expect(avIssue).toBeUndefined()
      expect(sectionIssues).toEqual([])
    })
  })

  describe('apiVersion warnings', () => {
    it('warns when apiVersion is missing', () => {
      const issues = validateSpec(makeInput({
        frontmatter: {
          kind: 'lens',
          schema_version: 1,
          id: 'lens_test',
          name: 'Test',
          description: 'A test.',
        },
      }))
      const avIssue = issues.find((i) => i.path === 'apiVersion')
      expect(avIssue).toBeDefined()
      expect(avIssue!.severity).toBe('warning')
    })

    it('flags when apiVersion has wrong prefix', () => {
      const issues = validateSpec(makeInput({
        frontmatter: {
          kind: 'lens',
          schema_version: 1,
          id: 'lens_test',
          name: 'Test',
          description: 'A test.',
          apiVersion: 'wrong/v1',
        },
      }))
      const avIssues = issues.filter((i) => i.path === 'apiVersion')
      expect(avIssues.length).toBeGreaterThanOrEqual(1)
      // AJV may flag as error (pattern mismatch), spec-validator adds warning
      const hasSchemaError = avIssues.some((i) => i.severity === 'error')
      const hasWarning = avIssues.some((i) => i.severity === 'warning')
      expect(hasSchemaError || hasWarning).toBe(true)
    })
  })

  describe('all kinds validate through AJV', () => {
    const testCases: Array<{ kind: string; frontmatter: Record<string, unknown>; sections: Record<string, string> }> = [
      {
        kind: 'lens',
        frontmatter: { kind: 'lens', schema_version: 1, id: 'lens_t', name: 'T', description: 'D', apiVersion: 'lenserfight.dev/v1alpha1' },
        sections: { Purpose: 'T', Prompt: 'T', Inputs: 'T', Outputs: 'T' },
      },
      {
        kind: 'lenser',
        frontmatter: { kind: 'lenser', schema_version: 1, id: 'lenser_t', name: 'T', description: 'D', apiVersion: 'lenserfight.dev/v1alpha1' },
        sections: { Mission: 'T', Activation: 'T', 'Operating Rules': 'T' },
      },
      {
        kind: 'colens',
        frontmatter: { kind: 'colens', schema_version: 1, id: 'colens_t', name: 'T', description: 'D', apiVersion: 'lenserfight.dev/v1alpha1' },
        sections: { Purpose: 'T', Inputs: 'T', Steps: 'T', Outputs: 'T' },
      },
      {
        kind: 'team',
        frontmatter: { kind: 'team', schema_version: 1, id: 'team_t', name: 'T', description: 'D', apiVersion: 'lenserfight.dev/v1alpha1' },
        sections: { 'Team Purpose': 'T', LENSERS: 'T', 'Collaboration Rules': 'T' },
      },
      {
        kind: 'agent',
        frontmatter: { kind: 'agent', schema_version: 1, id: 'agent_t', name: 'T', apiVersion: 'lenserfight.dev/v1alpha1' },
        sections: { Purpose: 'T', Instructions: 'T', 'Execution Policy': 'T' },
      },
      {
        kind: 'tool',
        frontmatter: { kind: 'tool', schema_version: 1, id: 'tool_t', name: 'T', apiVersion: 'lenserfight.dev/v1alpha1' },
        sections: { 'Capability Description': 'T', Inputs: 'T', Outputs: 'T', 'Failure Modes': 'T' },
      },
    ]

    for (const tc of testCases) {
      it(`validates ${tc.kind} through all layers without issues`, () => {
        const issues = validateSpec({
          frontmatter: tc.frontmatter,
          body: Object.keys(tc.sections).map((s) => `# ${s}\nContent`).join('\n\n'),
          sections: tc.sections,
        })
        expect(issues, `${tc.kind} should have no issues`).toEqual([])
      })
    }
  })
})
