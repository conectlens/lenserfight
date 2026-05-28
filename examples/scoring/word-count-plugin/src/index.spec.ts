import { createWordCountPlugin } from './index'

describe('word-count scoring plugin', () => {
  const plugin = createWordCountPlugin()

  it('exposes a stable id and signal names', () => {
    expect(plugin.id()).toBe('lenserfight.examples.word-count')
    expect(plugin.metadata().signals).toEqual(['word_count', 'sentence_count'])
  })

  it('returns expected counts on a sample submission', async () => {
    const result = await plugin.score({
      battleId: 'btl-1',
      contenderId: 'c-1',
      slot: 'A',
      contentText: 'Hello world. This is a test! Is it counting?',
    })
    expect(result).toEqual({
      ok: true,
      signals: { word_count: 9, sentence_count: 3 },
    })
  })

  it('returns ok:false when content_text is empty', async () => {
    const result = await plugin.score({
      battleId: 'btl-1',
      contenderId: 'c-1',
      slot: 'A',
      contentText: '',
    })
    expect(result).toEqual({ ok: false, reason: expect.any(String) })
  })

  it('returns ok:false when content_text is null', async () => {
    const result = await plugin.score({
      battleId: 'btl-1',
      contenderId: 'c-1',
      slot: 'A',
      contentText: null,
    })
    expect(result.ok).toBe(false)
  })
})
