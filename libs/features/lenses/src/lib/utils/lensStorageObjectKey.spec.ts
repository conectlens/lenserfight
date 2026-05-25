import { describe, expect, it } from 'vitest'

import { buildLensResourceObjectKey, sanitizeStoragePathSegment } from './lensStorageObjectKey'

describe('lensStorageObjectKey', () => {
  it('sanitizes spaces and special characters', () => {
    expect(sanitizeStoragePathSegment('analysis depth')).toBe('analysis-depth')
  })

  it('prefixes object key with auth user id for RLS', () => {
    const key = buildLensResourceObjectKey(
      'a1000000-0000-0000-0000-000000000001',
      'd5dda12c-d48c-428f-9a10-6776a0513db6',
      'analysis depth',
      'photo.jpeg'
    )
    expect(key).toBe(
      'a1000000-0000-0000-0000-000000000001/d5dda12c-d48c-428f-9a10-6776a0513db6/analysis-depth/photo.jpeg'
    )
  })
})
