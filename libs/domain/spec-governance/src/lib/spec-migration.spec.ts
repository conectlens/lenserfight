import { describe, it, expect } from 'vitest'
import { CURRENT_API_VERSION } from './api-version'
import {
  planMigration,
  applyMigration,
  migrateContents,
  extractApiVersionFromFrontmatter,
  extractSchemaVersionFromFrontmatter,
  splitDocument,
  schemaVersionToApiVersion,
} from './spec-migration'

const LENS_WITHOUT_API_VERSION = `---
kind: lens
schema_version: 1
id: lens_test
name: Test Lens
description: A test lens.
---

# Purpose
Test lens for migration tests.

# Prompt
Test prompt body.

# Inputs
test

# Outputs
test
`

const LENS_WITH_API_VERSION = `---
apiVersion: lenserfight.dev/v1alpha1
kind: lens
schema_version: 1
id: lens_test
name: Test Lens
description: A test lens.
---

# Purpose
Test.
`

const NO_FRONTMATTER = `# Just a Markdown file

No frontmatter here.
`

describe('splitDocument', () => {
  it('parses a document with frontmatter', () => {
    const result = splitDocument(LENS_WITHOUT_API_VERSION)
    expect(result).not.toBeNull()
    expect(result?.frontmatterRaw).toContain('kind: lens')
    expect(result?.body).toContain('# Purpose')
  })

  it('returns null when no frontmatter block', () => {
    expect(splitDocument(NO_FRONTMATTER)).toBeNull()
  })
})

describe('extractApiVersionFromFrontmatter', () => {
  it('returns null when apiVersion is absent', () => {
    expect(extractApiVersionFromFrontmatter('kind: lens\nschema_version: 1\n')).toBeNull()
  })

  it('returns the apiVersion value when present', () => {
    expect(
      extractApiVersionFromFrontmatter('apiVersion: lenserfight.dev/v1alpha1\nkind: lens\n')
    ).toBe('lenserfight.dev/v1alpha1')
  })
})

describe('extractSchemaVersionFromFrontmatter', () => {
  it('returns the integer schema_version', () => {
    expect(extractSchemaVersionFromFrontmatter('schema_version: 1\nkind: lens\n')).toBe(1)
  })

  it('returns null when schema_version is absent', () => {
    expect(extractSchemaVersionFromFrontmatter('kind: lens\n')).toBeNull()
  })
})

describe('schemaVersionToApiVersion', () => {
  it('maps schema_version 1 to v1alpha1', () => {
    expect(schemaVersionToApiVersion(1)).toBe('lenserfight.dev/v1alpha1')
  })

  it('returns null for unknown schema versions', () => {
    expect(schemaVersionToApiVersion(99)).toBeNull()
  })
})

describe('planMigration', () => {
  it('identifies a file that needs migration', () => {
    const plan = planMigration('test/LENS.MD', LENS_WITHOUT_API_VERSION)
    expect(plan.alreadyMigrated).toBe(false)
    expect(plan.hasLegacySchemaVersion).toBe(true)
    expect(plan.schemaVersion).toBe(1)
    expect(plan.currentApiVersion).toBeNull()
    expect(plan.targetApiVersion).toBe(CURRENT_API_VERSION)
  })

  it('identifies a file that is already migrated', () => {
    const plan = planMigration('test/LENS.MD', LENS_WITH_API_VERSION)
    expect(plan.alreadyMigrated).toBe(true)
    expect(plan.currentApiVersion).toBe('lenserfight.dev/v1alpha1')
  })

  it('handles files with no frontmatter', () => {
    const plan = planMigration('test/README.md', NO_FRONTMATTER)
    expect(plan.currentApiVersion).toBeNull()
    expect(plan.alreadyMigrated).toBe(false)
  })
})

describe('applyMigration', () => {
  it('adds apiVersion as the first line of the frontmatter', () => {
    const result = applyMigration(LENS_WITHOUT_API_VERSION)
    expect(result).not.toBeNull()
    // apiVersion must appear before kind
    const lines = result!.split('\n')
    const fmStart = lines.indexOf('---') + 1
    expect(lines[fmStart]).toMatch(/^apiVersion: lenserfight\.dev\/v1alpha1$/)
    expect(result).toContain('kind: lens')
    expect(result).toContain('# Purpose')
  })

  it('is idempotent when apiVersion is already present', () => {
    const once = applyMigration(LENS_WITH_API_VERSION)!
    const twice = applyMigration(once)!
    // Should not duplicate apiVersion
    const occurrences = (twice.match(/^apiVersion:/gm) ?? []).length
    expect(occurrences).toBe(1)
  })

  it('returns null for documents with no frontmatter', () => {
    expect(applyMigration(NO_FRONTMATTER)).toBeNull()
  })

  it('preserves the document body', () => {
    const result = applyMigration(LENS_WITHOUT_API_VERSION)!
    expect(result).toContain('# Purpose')
    expect(result).toContain('# Prompt')
  })
})

describe('migrateContents', () => {
  it('returns migrated status with new contents', () => {
    const result = migrateContents('test/LENS.MD', LENS_WITHOUT_API_VERSION)
    expect(result.status).toBe('migrated')
    expect(result.newContents).toBeDefined()
    expect(result.newContents).toContain('apiVersion: lenserfight.dev/v1alpha1')
  })

  it('returns already_current when no migration needed', () => {
    const result = migrateContents('test/LENS.MD', LENS_WITH_API_VERSION)
    expect(result.status).toBe('already_current')
    expect(result.newContents).toBeUndefined()
  })

  it('returns skipped for files with no frontmatter', () => {
    const result = migrateContents('test/README.md', NO_FRONTMATTER)
    expect(result.status).toBe('skipped')
  })
})
