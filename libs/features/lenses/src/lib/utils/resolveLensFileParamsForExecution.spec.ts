import { describe, expect, it } from 'vitest'

import { buildFileAttachmentBindings } from './resolveLensFileParamsForExecution'

describe('buildFileAttachmentBindings', () => {
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
