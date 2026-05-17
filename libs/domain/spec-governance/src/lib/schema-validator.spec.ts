import { describe, expect, it } from 'vitest'
import { validateFrontmatterSchema, hasSchema, getSchemaValidator } from './schema-validator'

describe('schema-validator', () => {
  describe('hasSchema', () => {
    it('returns true for known kinds', () => {
      expect(hasSchema('lens')).toBe(true)
      expect(hasSchema('lenser')).toBe(true)
      expect(hasSchema('battle')).toBe(true)
      expect(hasSchema('team')).toBe(true)
      expect(hasSchema('agent')).toBe(true)
      expect(hasSchema('workflow')).toBe(true)
      expect(hasSchema('tool')).toBe(true)
      expect(hasSchema('skill')).toBe(true)
      expect(hasSchema('dataset')).toBe(true)
      expect(hasSchema('benchmark')).toBe(true)
      expect(hasSchema('run_report')).toBe(true)
      expect(hasSchema('memory_policy')).toBe(true)
      expect(hasSchema('private_battle')).toBe(true)
      expect(hasSchema('agent_team')).toBe(true)
      expect(hasSchema('colens')).toBe(true)
      expect(hasSchema('ray')).toBe(true)
      expect(hasSchema('evaluation')).toBe(true)
      expect(hasSchema('execution')).toBe(true)
    })

    it('returns false for unknown kinds', () => {
      expect(hasSchema('unknown')).toBe(false)
      expect(hasSchema('')).toBe(false)
    })
  })

  describe('getSchemaValidator', () => {
    it('returns a compiled function for known kinds', () => {
      const validator = getSchemaValidator('lens')
      expect(validator).toBeTypeOf('function')
    })

    it('returns null for unknown kinds', () => {
      expect(getSchemaValidator('unknown')).toBeNull()
    })
  })

  describe('validateFrontmatterSchema', () => {
    it('returns empty array for valid lens frontmatter', () => {
      const issues = validateFrontmatterSchema('lens', {
        kind: 'lens',
        name: 'Test Lens',
        description: 'A test lens.',
      })
      expect(issues).toEqual([])
    })

    it('returns empty array for valid battle frontmatter', () => {
      const issues = validateFrontmatterSchema('battle', {
        kind: 'battle',
        name: 'Test Battle',
        description: 'A test battle.',
      })
      expect(issues).toEqual([])
    })

    it('returns empty array for unknown kind (no schema)', () => {
      const issues = validateFrontmatterSchema('unknown_kind', {
        kind: 'unknown_kind',
        name: 'Test',
      })
      expect(issues).toEqual([])
    })

    it('reports missing required fields', () => {
      const issues = validateFrontmatterSchema('lens', { kind: 'lens' })
      const paths = issues.map((i) => i.path)
      expect(paths).toContain('name')
      expect(paths).toContain('description')
      expect(issues.every((i) => i.severity === 'error')).toBe(true)
    })

    it('reports wrong kind const', () => {
      const issues = validateFrontmatterSchema('lens', {
        kind: 'battle',
        name: 'Test',
        description: 'Test',
      })
      const kindIssue = issues.find((i) => i.path === 'kind')
      expect(kindIssue).toBeDefined()
      expect(kindIssue!.message).toContain('must be')
    })

    it('reports type mismatch', () => {
      const issues = validateFrontmatterSchema('lens', {
        kind: 'lens',
        name: 123,
        description: 'Test',
      })
      const nameIssue = issues.find((i) => i.path === 'name')
      expect(nameIssue).toBeDefined()
      expect(nameIssue!.message).toContain('must be')
    })

    it('reports invalid enum value for visibility', () => {
      const issues = validateFrontmatterSchema('lens', {
        kind: 'lens',
        name: 'Test',
        description: 'Test',
        visibility: 'invalid',
      })
      const visIssue = issues.find((i) => i.path === 'visibility')
      expect(visIssue).toBeDefined()
      expect(visIssue!.message).toContain('must be one of')
    })

    it('reports empty name (minLength violation)', () => {
      const issues = validateFrontmatterSchema('lens', {
        kind: 'lens',
        name: '',
        description: 'Test',
      })
      const nameIssue = issues.find((i) => i.path === 'name')
      expect(nameIssue).toBeDefined()
      expect(nameIssue!.message).toContain('must not be empty')
    })

    it('validates slug format', () => {
      const issues = validateFrontmatterSchema('lens', {
        kind: 'lens',
        name: 'Test',
        description: 'Test',
        slug: 'Invalid Slug!',
      })
      const slugIssue = issues.find((i) => i.path === 'slug')
      expect(slugIssue).toBeDefined()
      expect(slugIssue!.message).toContain('does not match')
    })

    it('validates schema_version minimum', () => {
      const issues = validateFrontmatterSchema('lens', {
        kind: 'lens',
        name: 'Test',
        description: 'Test',
        schema_version: 0,
      })
      const svIssue = issues.find((i) => i.path === 'schema_version')
      expect(svIssue).toBeDefined()
      expect(svIssue!.message).toContain('at least 1')
    })

    it('allows additional properties', () => {
      const issues = validateFrontmatterSchema('lens', {
        kind: 'lens',
        name: 'Test',
        description: 'Test',
        custom_field: 'hello',
      })
      expect(issues).toEqual([])
    })

    it('deduplicates allOf cascading errors', () => {
      const issues = validateFrontmatterSchema('lens', { kind: 'lens' })
      // name and description should each appear exactly once
      const namePaths = issues.filter((i) => i.path === 'name')
      const descPaths = issues.filter((i) => i.path === 'description')
      expect(namePaths.length).toBe(1)
      expect(descPaths.length).toBe(1)
    })

    it('validates all new schema kinds', () => {
      const kinds = [
        { kind: 'team', required: { kind: 'team', name: 'T', description: 'D' } },
        { kind: 'agent', required: { kind: 'agent', name: 'A' } },
        { kind: 'agent_team', required: { kind: 'agent_team', name: 'AT' } },
        { kind: 'tool', required: { kind: 'tool', name: 'T' } },
        { kind: 'workflow', required: { kind: 'workflow', name: 'W' } },
        { kind: 'private_battle', required: { kind: 'private_battle', name: 'PB' } },
        { kind: 'skill', required: { kind: 'skill', name: 'S', description: 'D' } },
        { kind: 'memory_policy', required: { kind: 'memory_policy', name: 'MP' } },
        { kind: 'dataset', required: { kind: 'dataset', name: 'DS', description: 'D' } },
        { kind: 'benchmark', required: { kind: 'benchmark', name: 'B', description: 'D' } },
        { kind: 'run_report', required: { kind: 'run_report', name: 'RR' } },
      ]

      for (const { kind, required } of kinds) {
        const valid = validateFrontmatterSchema(kind, required)
        expect(valid, `${kind} with required fields should pass`).toEqual([])

        const invalid = validateFrontmatterSchema(kind, { kind })
        const missingName = invalid.find((i) => i.path === 'name')
        expect(missingName, `${kind} without name should fail`).toBeDefined()
      }
    })

    it('validates private_battle visibility constraint', () => {
      const issues = validateFrontmatterSchema('private_battle', {
        kind: 'private_battle',
        name: 'PB',
        visibility: 'public',
      })
      const visIssue = issues.find((i) => i.path === 'visibility')
      expect(visIssue).toBeDefined()
      expect(visIssue!.message).toContain('must be one of')
    })
  })
})
