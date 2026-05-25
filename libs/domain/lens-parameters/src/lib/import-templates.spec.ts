import { describe, expect, it } from 'vitest'
import type { LensVersionParam } from '@lenserfight/types'

import {
  IMPORT_META_KEY,
  buildImportCsvTemplate,
  buildImportJsonTemplate,
} from './import-templates'

function vp(
  label: string,
  type: LensVersionParam['tool']['type'],
  optional?: boolean,
): LensVersionParam {
  return {
    id: 'p1',
    versionId: 'v1',
    label,
    toolId: 't1',
    optional,
    tool: {
      id: 't1',
      key: label,
      label,
      description: null,
      category: 'input',
      type,
      required: !optional,
      minLength: 0,
      maxLength: 0,
      placeholder: null,
      helpText: null,
      validationSchema: null,
      options: type === 'select' ? [{ label: 'A', value: 'a' }] : null,
      sortOrder: 0,
      isSystem: false,
      icon: null,
      color: null,
    },
  }
}

describe('buildImportJsonTemplate', () => {
  it('includes _import metadata with typed tokens', () => {
    const json = buildImportJsonTemplate([
      vp('topic', 'text'),
      vp('attachment', 'file'),
      vp('notes', 'textarea', true),
    ])
    const parsed = JSON.parse(json) as Record<string, unknown>
    const meta = parsed[IMPORT_META_KEY] as { parameters: { token: string; importable: boolean }[] }

    expect(meta.parameters).toHaveLength(3)
    expect(meta.parameters[0].token).toBe('[[topic]]')
    expect(meta.parameters[1].token).toBe('[[attachment:file]]')
    expect(meta.parameters[1].importable).toBe(false)
    expect(meta.parameters[2].token).toBe('[[notes:textarea!]]')
    expect(parsed).toHaveProperty('topic')
    expect(parsed).not.toHaveProperty('attachment')
    expect(parsed).toHaveProperty('notes', null)
  })
})

describe('buildImportCsvTemplate', () => {
  it('omits file columns and uses label headers', () => {
    const csv = buildImportCsvTemplate([vp('topic', 'text'), vp('doc', 'file')])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('topic')
    expect(lines[1]).toContain('text value')
    expect(csv).not.toContain('doc')
  })

  it('returns a guide line when only file params exist', () => {
    const csv = buildImportCsvTemplate([vp('doc', 'file')])
    expect(csv).toContain('file-type params only')
  })
})
