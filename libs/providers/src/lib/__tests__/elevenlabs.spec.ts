import { elevenlabsAdapter } from '../elevenlabs'

const MOCK_AUDIO = new Uint8Array([0xff, 0xfb, 0x90, 0x00])

describe('elevenlabsAdapter', () => {
  let spy: jest.SpyInstance

  afterEach(() => {
    spy?.mockRestore()
  })

  it('returns completed with audio/mpeg on success', async () => {
    spy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(MOCK_AUDIO.buffer, {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg' },
      }),
    )

    const result = await elevenlabsAdapter.generate('xi-key', 'elevenlabs-v4', 'Hello world', {})
    expect(result.status).toBe('completed')
    if (result.status === 'completed') {
      expect(result.mimeType).toBe('audio/mpeg')
      expect(result.urls[0]).toMatch(/^data:audio\/mpeg;base64,/)
    }
  })

  it('throws when voice not found (404)', async () => {
    spy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: { status: 'voice_not_found' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(
      elevenlabsAdapter.generate('xi-key', 'elevenlabs-v4', 'test', { voice_id: 'bad-voice' }),
    ).rejects.toThrow()
  })
})
