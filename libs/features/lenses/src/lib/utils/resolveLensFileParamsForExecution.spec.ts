import { describe, expect, it, vi } from 'vitest'

vi.mock('@lenserfight/data/repositories', () => ({
  mediaRepository: {
    getById: vi.fn(),
    getSignedReadUrl: vi.fn(),
  },
}))

import { buildFileAttachmentBindings } from './resolveLensFileParamsForExecution'

describe('buildFileAttachmentBindings', () => {
  it('maps files params with multiple UUIDs to attachment_bindings', () => {
    const id1 = '3ade2802-1f55-4b1d-9b3a-0805ce8501b1'
    const id2 = '7a8b9c0d-1e2f-4a3b-8c9d-0e1f2a3b4c5d'
    const snapshot = { photos: [id1, id2] }
    const params = [{ label: 'photos', tool: { type: 'files' } }] as never

    expect(buildFileAttachmentBindings(snapshot, params)).toEqual([
      { media_object_id: id1, binding_key: 'photos' },
      { media_object_id: id2, binding_key: 'photos' },
    ])
  })

  it('maps file params with UUID values to attachment_bindings', () => {
    const snapshot = {
      topic: 'hello',
      file: '3ade2802-1f55-4b1d-9b3a-0805ce8501b1',
    }
    const params = [
      { label: 'topic', tool: { type: 'text' } },
      { label: 'file', tool: { type: 'file' } },
    ] as never

    expect(buildFileAttachmentBindings(snapshot, params)).toEqual([
      {
        media_object_id: '3ade2802-1f55-4b1d-9b3a-0805ce8501b1',
        binding_key: 'file',
      },
    ])
  })
})
