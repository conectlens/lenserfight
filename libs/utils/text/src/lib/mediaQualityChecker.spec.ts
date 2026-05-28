import { describe, expect, it } from 'vitest'
import { checkMediaQuality, type MediaQualityIO, type MediaQualityRule } from './mediaQualityChecker'

function makeFile(size: number, type = 'image/png'): File {
  // Minimal File shim — vitest's jsdom provides a global File, but we keep
  // the spec runtime-agnostic by faking the shape with what the checker uses.
  return {
    name: 'fixture',
    type,
    size,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  } as unknown as File
}

const passingImageIO: Partial<MediaQualityIO> = {
  probeImage: () => Promise.resolve({ width: 2048, height: 2048 }),
}

const undersizedImageIO: Partial<MediaQualityIO> = {
  probeImage: () => Promise.resolve({ width: 512, height: 512 }),
}

const overLongVideoIO: Partial<MediaQualityIO> = {
  probeVideo: () => Promise.resolve({ width: 1920, height: 1080, durationSeconds: 120 }),
}

const audioOkIO: Partial<MediaQualityIO> = {
  probeAudio: () => Promise.resolve({ durationSeconds: 30 }),
}

describe('checkMediaQuality', () => {
  it('passes when image meets min_width / min_height', async () => {
    const rule: MediaQualityRule = { modality: 'image', minWidth: 1024, minHeight: 1024 }
    const r = await checkMediaQuality(makeFile(1_000_000), rule, passingImageIO)
    expect(r.passed).toBe(true)
    expect(r.violations).toEqual([])
    expect(r.metadata.width).toBe(2048)
  })

  it('flags undersized image with min_width violation', async () => {
    const rule: MediaQualityRule = { modality: 'image', minWidth: 1024, minHeight: 1024 }
    const r = await checkMediaQuality(makeFile(1_000_000), rule, undersizedImageIO)
    expect(r.passed).toBe(false)
    expect(r.violations).toContain('min_width:512<1024')
  })

  it('flags over-length video with max_duration violation', async () => {
    const rule: MediaQualityRule = { modality: 'video', maxDurationSeconds: 30 }
    const r = await checkMediaQuality(makeFile(5_000_000, 'video/mp4'), rule, overLongVideoIO)
    expect(r.passed).toBe(false)
    expect(r.violations).toContain('max_duration_seconds:120>30')
  })

  it('flags oversized file with max_file_size_mb', async () => {
    const rule: MediaQualityRule = { modality: 'audio', maxFileSizeMb: 2 }
    const r = await checkMediaQuality(makeFile(5 * 1024 * 1024, 'audio/mpeg'), rule, audioOkIO)
    expect(r.passed).toBe(false)
    expect(r.violations.some((v) => v.startsWith('max_file_size_mb:'))).toBe(true)
  })

  it('passes when no rule constraint applies', async () => {
    const rule: MediaQualityRule = { modality: 'image' }
    const r = await checkMediaQuality(makeFile(1_000), rule, passingImageIO)
    expect(r.passed).toBe(true)
  })

  it('flags aspect ratio mismatch when required ratio is set', async () => {
    const rule: MediaQualityRule = {
      modality: 'image',
      requiredAspectRatio: '16:9',
    }
    const r = await checkMediaQuality(makeFile(1_000), rule, passingImageIO)
    expect(r.passed).toBe(false)
    expect(r.violations.some((v) => v.startsWith('aspect_ratio:'))).toBe(true)
  })
})
