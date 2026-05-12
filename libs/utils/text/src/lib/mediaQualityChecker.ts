// Phase BK — client-side media quality checker.
//
// Pre-upload validation that mirrors the server-side fn_check_media_quality
// rules. Browser-only: reads File via FileReader / HTMLImageElement to extract
// metadata. Tests inject `__io` overrides to avoid touching the real DOM.

export type MediaModality = 'image' | 'video' | 'audio'

export interface MediaQualityRule {
  modality: MediaModality
  minWidth?: number | null
  minHeight?: number | null
  maxDurationSeconds?: number | null
  requiredAspectRatio?: string | null
  maxFileSizeMb?: number | null
}

export interface MediaQualityCheckResult {
  passed: boolean
  violations: string[]
  metadata: Partial<{
    width: number
    height: number
    durationSeconds: number
    aspectRatio: string
    sizeMb: number
  }>
}

interface FileMetaProbe {
  width?: number
  height?: number
  durationSeconds?: number
}

export interface MediaQualityIO {
  probeImage: (file: File) => Promise<FileMetaProbe>
  probeVideo: (file: File) => Promise<FileMetaProbe>
  probeAudio: (file: File) => Promise<FileMetaProbe>
}

const defaultIO: MediaQualityIO = {
  probeImage: (file) =>
    new Promise((resolve, reject) => {
      if (typeof Image === 'undefined' || typeof URL === 'undefined') {
        // Non-DOM env (Node tests) — caller must inject overrides.
        return reject(new Error('probeImage requires a DOM environment'))
      }
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
        URL.revokeObjectURL(url)
      }
      img.onerror = (e) => {
        URL.revokeObjectURL(url)
        reject(new Error(`probeImage failed: ${String(e)}`))
      }
      img.src = url
    }),
  probeVideo: (file) =>
    new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        return reject(new Error('probeVideo requires a DOM environment'))
      }
      const url = URL.createObjectURL(file)
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => {
        resolve({
          width: v.videoWidth,
          height: v.videoHeight,
          durationSeconds: Math.round(v.duration),
        })
        URL.revokeObjectURL(url)
      }
      v.onerror = (e) => {
        URL.revokeObjectURL(url)
        reject(new Error(`probeVideo failed: ${String(e)}`))
      }
      v.src = url
    }),
  probeAudio: (file) =>
    new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        return reject(new Error('probeAudio requires a DOM environment'))
      }
      const url = URL.createObjectURL(file)
      const a = document.createElement('audio')
      a.preload = 'metadata'
      a.onloadedmetadata = () => {
        resolve({ durationSeconds: Math.round(a.duration) })
        URL.revokeObjectURL(url)
      }
      a.onerror = (e) => {
        URL.revokeObjectURL(url)
        reject(new Error(`probeAudio failed: ${String(e)}`))
      }
      a.src = url
    }),
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function computeAspectRatio(w?: number, h?: number): string | undefined {
  if (!w || !h) return undefined
  const d = gcd(w, h)
  return `${w / d}:${h / d}`
}

async function probe(
  file: File,
  modality: MediaModality,
  io: MediaQualityIO,
): Promise<FileMetaProbe> {
  if (modality === 'image') return io.probeImage(file)
  if (modality === 'video') return io.probeVideo(file)
  return io.probeAudio(file)
}

export async function checkMediaQuality(
  file: File,
  rule: MediaQualityRule,
  io: Partial<MediaQualityIO> = {},
): Promise<MediaQualityCheckResult> {
  const merged: MediaQualityIO = { ...defaultIO, ...io }
  const meta = await probe(file, rule.modality, merged)

  const violations: string[] = []
  const sizeMb = file.size / (1024 * 1024)
  const aspect = computeAspectRatio(meta.width, meta.height)

  if (rule.minWidth != null && (meta.width == null || meta.width < rule.minWidth)) {
    violations.push(`min_width:${meta.width ?? 'null'}<${rule.minWidth}`)
  }
  if (rule.minHeight != null && (meta.height == null || meta.height < rule.minHeight)) {
    violations.push(`min_height:${meta.height ?? 'null'}<${rule.minHeight}`)
  }
  if (
    rule.maxDurationSeconds != null &&
    meta.durationSeconds != null &&
    meta.durationSeconds > rule.maxDurationSeconds
  ) {
    violations.push(`max_duration_seconds:${meta.durationSeconds}>${rule.maxDurationSeconds}`)
  }
  if (rule.requiredAspectRatio && aspect && aspect !== rule.requiredAspectRatio) {
    violations.push(`aspect_ratio:${aspect}!=${rule.requiredAspectRatio}`)
  }
  if (rule.maxFileSizeMb != null && sizeMb > rule.maxFileSizeMb) {
    violations.push(`max_file_size_mb:${sizeMb.toFixed(2)}>${rule.maxFileSizeMb}`)
  }

  return {
    passed: violations.length === 0,
    violations,
    metadata: {
      ...(meta.width != null ? { width: meta.width } : {}),
      ...(meta.height != null ? { height: meta.height } : {}),
      ...(meta.durationSeconds != null ? { durationSeconds: meta.durationSeconds } : {}),
      ...(aspect ? { aspectRatio: aspect } : {}),
      sizeMb: Number(sizeMb.toFixed(2)),
    },
  }
}
