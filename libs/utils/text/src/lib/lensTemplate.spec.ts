import { describe, expect, it } from 'vitest'
import type { LensVersionParam } from '@lenserfight/types'
import { extractParams, renderLensContentForCopy } from './lensTemplate'

const vp = (id: string, label: string): LensVersionParam => ({
  id,
  versionId: 'v1',
  label,
  toolId: 't1',
  tool: { id: 't1', type: 'string', required: true } as unknown as LensVersionParam['tool'],
})

describe('extractParams', () => {
  it('extracts single-word params', () => {
    expect(extractParams('[[mood]]')).toEqual([{ name: 'mood' }])
  })

  it('extracts multi-word params with spaces', () => {
    expect(extractParams('[[Visual Tone]]')).toEqual([{ name: 'visual tone' }])
  })

  it('extracts params with hyphens', () => {
    expect(extractParams('[[color-palette]]')).toEqual([{ name: 'color-palette' }])
  })

  it('marks params with trailing ! as optional', () => {
    expect(extractParams('[[mood!]]')).toEqual([{ name: 'mood', optional: true }])
  })

  it('marks multi-word params with trailing ! as optional', () => {
    expect(extractParams('[[Color Palette!]]')).toEqual([{ name: 'color palette', optional: true }])
  })

  it('deduplicates params case-insensitively', () => {
    expect(extractParams('[[Mood]] [[mood]] [[MOOD]]')).toEqual([{ name: 'mood' }])
  })

  it('does not match tokens with leading space', () => {
    expect(extractParams('[[ bad]]')).toEqual([])
  })

  it('does not match empty brackets', () => {
    expect(extractParams('[[]]')).toEqual([])
  })

  it('extracts all params from the AI wallpaper prompt example', () => {
    const template = `Theme or subject: [[Theme or Subject]]
Visual style: [[Visual Style]]
Mood: [[Mood]]
Color palette: [[Color Palette]]
Device or aspect ratio: [[Device or Aspect Ratio]]
Level of detail: [[Level of Detail]]
Text on wallpaper: [[Text on Wallpaper!]]
Things to avoid: [[Things to Avoid]]`
    const names = extractParams(template).map((p) => p.name)
    expect(names).toEqual([
      'theme or subject',
      'visual style',
      'mood',
      'color palette',
      'device or aspect ratio',
      'level of detail',
      'text on wallpaper',
      'things to avoid',
    ])
    const textOnWallpaper = extractParams(template).find((p) => p.name === 'text on wallpaper')
    expect(textOnWallpaper?.optional).toBe(true)
  })
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
