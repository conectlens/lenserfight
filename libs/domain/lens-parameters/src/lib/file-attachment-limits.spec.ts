import { describe, expect, it } from 'vitest'
import type { LensVersionParam } from '@lenserfight/types'

import {
  effectiveMaxCount,
  MAX_FILES_PER_FILES_PARAM,
  normalizeFilesParamIds,
} from './file-attachment-limits'
import { coerceParamValue, formatParamForPrompt } from './coerce-param-value'
import { parseParamTokenInner } from './parse-param-token'

function filesParam(): LensVersionParam {
  return {
    id: 'p1',
    versionId: 'v1',
    label: 'photos',
    toolId: 't1',
    tool: {
      id: 't1',
      key: 'files',
      label: 'photos',
      description: null,
      category: 'media',
      type: 'files',
      required: false,
      minLength: 0,
      maxLength: 0,
      placeholder: null,
      helpText: null,
      validationSchema: { maxCount: 3 },
      options: null,
      sortOrder: 0,
      isSystem: false,
      icon: null,
      color: null,
    },
  }
}

describe('parseParamTokenInner files', () => {
  it('parses [[Photos:files]]', () => {
    expect(parseParamTokenInner('Photos:files')).toEqual({
      label: 'photos',
      optional: false,
      typeHint: 'files',
    })
  })
})

describe('normalizeFilesParamIds', () => {
  it('dedupes and validates UUIDs', () => {
    const id = '8f7fc7b2-cfa9-4ea9-81bd-ba12808c1231'
    expect(normalizeFilesParamIds([id, id, 'not-uuid'])).toEqual([id])
  })
})

describe('coerceParamValue files', () => {
  it('coerces to string array', () => {
    const id = '8f7fc7b2-cfa9-4ea9-81bd-ba12808c1231'
    expect(coerceParamValue(id, filesParam())).toEqual([id])
  })
})

describe('formatParamForPrompt files', () => {
  it('JSON-stringifies URL array for copy', () => {
    const urls = ['https://a.example/x', 'https://b.example/y']
    expect(formatParamForPrompt(urls, filesParam())).toBe(JSON.stringify(urls))
  })

  it('JSON-stringifies UUID array for internal copy', () => {
    const ids = ['8f7fc7b2-cfa9-4ea9-81bd-ba12808c1231']
    expect(formatParamForPrompt(ids, filesParam())).toBe(JSON.stringify(ids))
  })
})

describe('effectiveMaxCount', () => {
  it('caps schema maxCount to platform limit', () => {
    const p = filesParam()
    p.tool.validationSchema = { maxCount: 99 }
    expect(effectiveMaxCount(p)).toBe(MAX_FILES_PER_FILES_PARAM)
  })
})
