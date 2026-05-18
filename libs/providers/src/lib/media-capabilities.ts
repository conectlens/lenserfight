/**
 * Per-model media-generation capabilities — a UI-facing read of the same
 * profile registries the adapters consult on the wire. This is the seam
 * that lets `LabExecutionPanel` hide or disable controls the model rejects
 * (e.g. don't show a `1920x1080` size for `dall-e-2`).
 *
 * GRASP — *Information Expert*. The provider/profile modules already own this
 * knowledge; this file is a thin façade so UI code doesn't have to import
 * each provider's profile module individually.
 */

import { getOpenAIImageProfile } from './openai-image-profiles'
import { lookupModel } from './model-registry'

export interface MediaCapabilities {
  /** Modality the model produces (or null when the model is unknown). */
  kind: 'image' | 'video' | 'audio' | 'music' | 'text' | null
  /** Allowed image sizes as 'WxH' strings (or 'auto'). Empty when N/A. */
  imageSizes: string[]
  /** Allowed quality presets. Empty when the API doesn't accept the param. */
  imageQualities: string[]
  /** Whether the model accepts the `style` parameter. */
  supportsStyle: boolean
  /** Allowed `n` (batch size). Always at least 1. */
  maxBatch: number
  /** Allowed aspect ratios (video / image). */
  aspectRatios: string[]
  /** Allowed duration in seconds (video / audio); empty array = any positive value. */
  durations: number[]
  /**
   * `true` when the adapter can ALSO be reached via Vertex AI by supplying an
   * optional `project` (GCP project id) parameter. The UI can use this to
   * decide whether to render an "Advanced: Vertex project" input. Pure
   * AI-Studio-only models leave this `false`.
   */
  supportsVertexProject: boolean
  /**
   * Known voice IDs for audio providers (e.g. ElevenLabs voices).
   * Empty array means voice selection is not applicable or not available.
   * Each entry: { id: string; label: string }
   */
  voices: readonly { id: string; label: string }[]
  /**
   * Whether the adapter accepts a `speed` parameter for audio playback/TTS.
   * When true, the UI should render a speed slider (0.5–2.0).
   */
  supportsAudioSpeed: boolean
  /**
   * Accepted audio output formats. Empty means the adapter controls the format.
   */
  audioFormats: readonly ('mp3' | 'wav' | 'opus' | 'flac')[]
}

const EMPTY: MediaCapabilities = {
  kind: null,
  imageSizes: [],
  imageQualities: [],
  supportsStyle: false,
  maxBatch: 1,
  aspectRatios: [],
  durations: [],
  supportsVertexProject: false,
  voices: [],
  supportsAudioSpeed: false,
  audioFormats: [],
}

/** Well-known ElevenLabs voice presets exposed in the UI. */
const ELEVENLABS_VOICES: readonly { id: string; label: string }[] = [
  { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel (default)' },
  { id: 'AZnzlk1XvdvUeBnXmlld', label: 'Domi' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Bella' },
  { id: 'ErXwobaYiN019PkySvjV', label: 'Antoni' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', label: 'Elli' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', label: 'Josh' },
  { id: 'VR6AewLTigWG4xSOukaG', label: 'Arnold' },
  { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', label: 'Sam' },
]

export function getMediaCapabilities(modelKey: string): MediaCapabilities {
  const descriptor = lookupModel(modelKey)
  if (!descriptor) return EMPTY

  switch (descriptor.provider) {
    case 'openai':
      if (descriptor.kind === 'image') {
        const profile = getOpenAIImageProfile(descriptor.wireModel) ?? getOpenAIImageProfile(modelKey)
        if (!profile) return { ...EMPTY, kind: 'image' }
        return {
          ...EMPTY,
          kind: 'image',
          imageSizes: [...profile.validSizes],
          imageQualities: [...profile.validQualities],
          supportsStyle: profile.supportsStyle,
          maxBatch: profile.maxBatch,
        }
      }
      if (descriptor.kind === 'video') {
        return {
          ...EMPTY,
          kind: 'video',
          aspectRatios: ['16:9', '9:16'],
          durations: [5, 10, 15, 20],
        }
      }
      break
    case 'google':
      // All Google media adapters now run via AI Studio by default (just an
      // AIza… API key) and can be opted into Vertex by passing a `project`.
      if (descriptor.kind === 'image') {
        return {
          ...EMPTY,
          kind: 'image',
          imageSizes: [],
          aspectRatios: ['1:1', '9:16', '16:9', '4:3', '3:4'],
          maxBatch: 4,
          supportsVertexProject: true,
        }
      }
      if (descriptor.kind === 'video') {
        return {
          ...EMPTY,
          kind: 'video',
          aspectRatios: ['16:9', '9:16'],
          durations: [5, 6, 7, 8],
          supportsVertexProject: true,
        }
      }
      if (descriptor.kind === 'music' || descriptor.kind === 'audio') {
        return {
          ...EMPTY,
          kind: descriptor.kind,
          durations: [10, 30, 60, 120],
          supportsVertexProject: true,
        }
      }
      break
    case 'stability':
      return {
        ...EMPTY,
        kind: 'image',
        aspectRatios: ['1:1', '16:9', '21:9', '2:3', '3:2', '4:5', '5:4', '9:16', '9:21'],
      }
    case 'elevenlabs':
      return {
        ...EMPTY,
        kind: 'audio',
        voices: ELEVENLABS_VOICES,
        supportsAudioSpeed: true,
        audioFormats: ['mp3', 'wav', 'opus', 'flac'],
      }
    case 'kling':
      return { ...EMPTY, kind: 'video', aspectRatios: ['16:9', '9:16', '1:1'], durations: [5, 10] }
    case 'suno':
      return { ...EMPTY, kind: 'music', durations: [30, 60, 120, 180] }
    case 'fal':
      return { ...EMPTY, kind: 'image', maxBatch: 4 }
    default:
      break
  }

  return { ...EMPTY, kind: descriptor.kind }
}
