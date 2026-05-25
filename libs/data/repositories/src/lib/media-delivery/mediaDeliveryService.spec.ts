import { describe, expect, it, vi } from 'vitest'
import { deliverMedia } from './mediaDeliveryService'
import { FILE_PARAM_CLIPBOARD_PLACEHOLDER } from './types'

vi.mock('./config', () => ({
  getSupabasePublicUrl: vi.fn(() => ''),
  isMediaContentProxyEnabled: vi.fn(() => false),
  getMediaInlineMaxBytes: vi.fn(() => 8 * 1024 * 1024),
}))

describe('deliverMedia', () => {
  const baseObject = {
    id: '11111111-1111-1111-1111-111111111111',
    workspaceId: 'w',
    ownerLenserId: 'l',
    bucket: 'lens-resources',
    objectKey: 'k',
    contentText: null,
    externalUrl: null,
    mimeType: 'image/jpeg',
    mediaType: 'image' as const,
    name: 'f',
    byteSize: 100,
    checksumSha256: null,
    visibility: 'private' as const,
    lifecycleState: 'active' as const,
    metadata: null,
    createdAt: '',
    updatedAt: '',
  }

  it('returns placeholder for clipboard when URL is loopback and no tunnel', async () => {
    const result = await deliverMedia({
      object: baseObject,
      signedUrl: 'http://127.0.0.1:54321/storage/sign/x',
      purpose: 'clipboard_external',
      mimeType: 'image/jpeg',
    })
    expect(result).toEqual({ kind: 'placeholder', text: FILE_PARAM_CLIPBOARD_PLACEHOLDER })
  })

  it('returns external URL as-is', async () => {
    const result = await deliverMedia({
      object: { ...baseObject, externalUrl: 'https://cdn.example.com/a.jpg' },
      signedUrl: null,
      purpose: 'clipboard_external',
      mimeType: 'image/jpeg',
    })
    expect(result).toEqual({ kind: 'url', url: 'https://cdn.example.com/a.jpg' })
  })
})
