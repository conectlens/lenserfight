import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AUTOMATION_KIND_TO_SPEC_KIND, SPEC_KIND_META, SPEC_KINDS, type SpecKind } from './spec-kinds'

const SCHEMAS_DIR = resolve(__dirname, 'schemas')

function loadSchema(fileName: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(SCHEMAS_DIR, fileName), 'utf-8'))
}

/**
 * Extract the primary kind value from a schema's kind field.
 * Handles both `"const": "lens"` and `"enum": ["lenser", "agent"]` (uses first value).
 */
function getSchemaKindConst(schema: Record<string, unknown>): string | undefined {
  const props = schema.properties as Record<string, unknown> | undefined
  if (!props?.kind) return undefined
  const kindDef = props.kind as Record<string, unknown>
  if (typeof kindDef.const === 'string') return kindDef.const
  if (Array.isArray(kindDef.enum) && kindDef.enum.length > 0) return kindDef.enum[0] as string
  return undefined
}

function getSchemaRequiredFields(schema: Record<string, unknown>): string[] {
  const required = new Set<string>()

  // Own required
  if (Array.isArray(schema.required)) {
    for (const f of schema.required) required.add(f as string)
  }

  // Inherited from allOf → baseSpec (common.schema.json#/$defs/baseSpec has required: ["kind", "name"])
  const allOf = schema.allOf as Array<Record<string, unknown>> | undefined
  if (allOf) {
    for (const entry of allOf) {
      const ref = entry.$ref as string | undefined
      if (ref?.includes('baseSpec')) {
        const commonSchema = loadSchema('common.schema.json')
        const defs = commonSchema.$defs as Record<string, Record<string, unknown>> | undefined
        if (defs?.baseSpec && Array.isArray(defs.baseSpec.required)) {
          for (const f of defs.baseSpec.required) required.add(f as string)
        }
      }
    }
  }

  return [...required].sort()
}

describe('schema <-> SPEC_KIND_META drift detection', () => {
  const schemaFiles = readdirSync(SCHEMAS_DIR).filter(
    (f) => f.endsWith('.schema.json') && f !== 'common.schema.json',
  )

  it('every schema file maps to a known SpecKind', () => {
    for (const file of schemaFiles) {
      const schema = loadSchema(file)
      const kindConst = getSchemaKindConst(schema)
      expect(kindConst, `${file} must have a "kind" const`).toBeDefined()
      const specKind = AUTOMATION_KIND_TO_SPEC_KIND[kindConst!]
      expect(specKind, `${file} kind="${kindConst}" must map to a SpecKind`).toBeDefined()
    }
  })

  it('JSON Schema required fields match SPEC_KIND_META.requiredFields for every kind with a schema', () => {
    const mismatches: string[] = []

    for (const file of schemaFiles) {
      const schema = loadSchema(file)
      const kindConst = getSchemaKindConst(schema)
      if (!kindConst) continue

      const specKind = AUTOMATION_KIND_TO_SPEC_KIND[kindConst] as SpecKind | undefined
      if (!specKind) continue

      const schemaRequired = getSchemaRequiredFields(schema)
      const metaRequired = [...SPEC_KIND_META[specKind].requiredFields].sort()

      if (JSON.stringify(schemaRequired) !== JSON.stringify(metaRequired)) {
        mismatches.push(
          `${file} (kind=${kindConst}): schema required=${JSON.stringify(schemaRequired)}, meta required=${JSON.stringify(metaRequired)}`,
        )
      }
    }

    expect(mismatches, 'Schema required fields must match SPEC_KIND_META.requiredFields').toEqual([])
  })

  it('every SpecKind has a corresponding schema file', () => {
    const kindsWithSchemas = new Set<SpecKind>()
    for (const file of schemaFiles) {
      const schema = loadSchema(file)
      const kindConst = getSchemaKindConst(schema)
      if (kindConst) {
        const specKind = AUTOMATION_KIND_TO_SPEC_KIND[kindConst]
        if (specKind) kindsWithSchemas.add(specKind)
      }
    }

    const missing = SPEC_KINDS.filter((k) => !kindsWithSchemas.has(k))
    expect(missing, 'All SpecKinds must have schema files').toEqual([])
  })
})
