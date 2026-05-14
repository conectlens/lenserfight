import { describe, expect, it } from 'vitest'
import type { LensVersionParam } from '@lenserfight/types'
import { renderLensContentForCopy } from './lensTemplate'

const vp = (id: string, label: string): LensVersionParam => ({
  id,
  versionId: 'v1',
  label,
  toolId: 't1',
  tool: { id: 't1', type: 'string', required: true } as unknown as LensVersionParam['tool'],
})

describe('renderLensContentForCopy', () => {
  it('returns empty string for empty input', () => {
    expect(renderLensContentForCopy('', [])).toBe('')
  })

  it('passes plain text through unchanged', () => {
    expect(renderLensContentForCopy('hello world', [])).toBe('hello world')
  })

  it('normalizes legacy {{param}} tokens to [[param]]', () => {
    expect(renderLensContentForCopy('say {{greeting}} now', [])).toBe('say [[greeting]] now')
  })

  it('preserves named [[param]] tokens', () => {
    expect(renderLensContentForCopy('hi [[name]]!', [])).toBe('hi [[name]]!')
  })

  it('resolves [[:uuid]] refs to [[label]] using versionParams', () => {
    const uuid = '11111111-2222-3333-4444-555555555555'
    const params = [vp(uuid, 'Topic')]
    expect(renderLensContentForCopy(`Write about [[:${uuid}]] today`, params))
      .toBe('Write about [[Topic]] today')
  })

  it('falls back to short uuid prefix when ref is not in versionParams', () => {
    const uuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    expect(renderLensContentForCopy(`x [[:${uuid}]] y`, []))
      .toBe('x [[aaaaaaaa]] y')
  })

  it('handles mixed text, named, and uuid-ref segments', () => {
    const uuid = '11111111-2222-3333-4444-555555555555'
    const out = renderLensContentForCopy(
      `Pre [[name]] mid [[:${uuid}]] post`,
      [vp(uuid, 'Topic')],
    )
    expect(out).toBe('Pre [[name]] mid [[Topic]] post')
  })
})
