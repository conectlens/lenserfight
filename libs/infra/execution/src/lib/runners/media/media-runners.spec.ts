// Media Runners — unit tests for all generative media node runners.
// Validates nodeType, fallback/error behavior, provider delegation, and
// upstream-URL extraction for each runner.
import { describe, it, expect, vi } from 'vitest'

import { ImageToAudioRunner } from './image-to-audio.runner'
import { ImageToImageRunner } from './image-to-image.runner'
import { ImageUpscaleRunner } from './image-upscale.runner'
import { MediaConvertRunner } from './media-convert.runner'
import { SpeechToTextRunner } from './speech-to-text.runner'
import { TextToImageRunner } from './text-to-image.runner'
import { TextToSpeechRunner } from './text-to-speech.runner'
import { TextToVideoRunner } from './text-to-video.runner'

import type { ExecutionResult } from '../../execution.types'
import type { NodeRunnerContext } from '../node-runner.interface'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<NodeRunnerContext> = {}): NodeRunnerContext {
  return {
    nodeId:          'test-node',
    upstreamOutputs: new Map(),
    resolvedParams:  {},
    nodeConfig:      {},
    ...overrides,
  }
}

function makeImageUpstream(url = 'https://cdn.example.com/img.png'): Map<string, ExecutionResult> {
  return new Map([['img-node', { mediaType: 'image', url }]])
}

function makeAudioUpstream(url = 'https://cdn.example.com/audio.mp3'): Map<string, ExecutionResult> {
  return new Map([['audio-node', { mediaType: 'audio', url }]])
}

function mockProvider(result: Partial<ExecutionResult> = {}) {
  return vi.fn().mockResolvedValue({
    mediaType: 'text',
    text:      'provider output',
    url:       'https://cdn.example.com/out.png',
    ...result,
  })
}

// ── TextToImageRunner ─────────────────────────────────────────────────────────

describe('TextToImageRunner', () => {
  const runner = new TextToImageRunner()

  it('has nodeType = text_to_image', () => {
    expect(runner.nodeType).toBe('text_to_image')
  })

  it('returns image fallback when no provider is wired', async () => {
    const result = await runner.execute(makeCtx())
    expect(result.output.mediaType).toBe('image')
    expect(result.output.data).toMatchObject({ fallback: true })
  })

  it('calls executeProvider and returns image mediaType', async () => {
    const executeProvider = mockProvider({ url: 'https://img.example.com/gen.png' })
    const result = await runner.execute(makeCtx({ resolvedPrompt: 'A sunset', executeProvider }))

    expect(executeProvider).toHaveBeenCalledWith(expect.objectContaining({ prompt: 'A sunset' }))
    expect(result.output.mediaType).toBe('image')
    expect(result.output.url).toBe('https://img.example.com/gen.png')
  })

  it('passes image params to provider', async () => {
    const executeProvider = mockProvider()
    await runner.execute(makeCtx({
      resolvedPrompt: 'Prompt',
      executeProvider,
      nodeConfig: { width: 1024, height: 768, quality: 'hd' },
    }))

    expect(executeProvider).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ width: 1024, height: 768, quality: 'hd' }) }),
    )
  })

  it('throws when signal is aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const executeProvider = mockProvider()
    await expect(runner.execute(makeCtx({ resolvedPrompt: 'x', executeProvider, signal: controller.signal }))).rejects.toThrow('Execution aborted')
  })
})

// ── TextToSpeechRunner ────────────────────────────────────────────────────────

describe('TextToSpeechRunner', () => {
  const runner = new TextToSpeechRunner()

  it('has nodeType = text_to_speech', () => {
    expect(runner.nodeType).toBe('text_to_speech')
  })

  it('returns audio fallback when no provider is wired', async () => {
    const result = await runner.execute(makeCtx())
    expect(result.output.mediaType).toBe('audio')
    expect(result.output.data).toMatchObject({ fallback: true })
  })

  it('calls executeProvider and returns audio mediaType', async () => {
    const executeProvider = mockProvider({ url: 'https://cdn.example.com/speech.mp3' })
    const result = await runner.execute(makeCtx({ resolvedPrompt: 'Hello world', executeProvider }))

    expect(result.output.mediaType).toBe('audio')
  })

  it('passes voice params to provider', async () => {
    const executeProvider = mockProvider()
    await runner.execute(makeCtx({
      resolvedPrompt: 'Text',
      executeProvider,
      nodeConfig: { voiceId: 'voice-adam', format: 'mp3' },
    }))

    expect(executeProvider).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ voice_id: 'voice-adam', format: 'mp3' }) }),
    )
  })

  it('throws when signal is aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const executeProvider = mockProvider()
    await expect(runner.execute(makeCtx({ resolvedPrompt: 'x', executeProvider, signal: controller.signal }))).rejects.toThrow('Execution aborted')
  })
})

// ── TextToVideoRunner ─────────────────────────────────────────────────────────

describe('TextToVideoRunner', () => {
  const runner = new TextToVideoRunner()

  it('has nodeType = text_to_video', () => {
    expect(runner.nodeType).toBe('text_to_video')
  })

  it('returns video fallback when no provider is wired', async () => {
    const result = await runner.execute(makeCtx())
    expect(result.output.mediaType).toBe('video')
    expect(result.output.data).toMatchObject({ fallback: true })
  })

  it('calls executeProvider and returns video mediaType', async () => {
    const executeProvider = mockProvider({ url: 'https://cdn.example.com/clip.mp4' })
    const result = await runner.execute(makeCtx({ resolvedPrompt: 'A car race', executeProvider }))

    expect(result.output.mediaType).toBe('video')
  })

  it('throws when signal is aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const executeProvider = mockProvider()
    await expect(runner.execute(makeCtx({ resolvedPrompt: 'x', executeProvider, signal: controller.signal }))).rejects.toThrow('Execution aborted')
  })
})

// ── ImageToImageRunner ────────────────────────────────────────────────────────

describe('ImageToImageRunner', () => {
  const runner = new ImageToImageRunner()

  it('has nodeType = image_to_image', () => {
    expect(runner.nodeType).toBe('image_to_image')
  })

  it('returns fallback when no provider is wired', async () => {
    const upstreamOutputs = makeImageUpstream()
    const result = await runner.execute(makeCtx({ upstreamOutputs }))

    expect(result.output.mediaType).toBe('image')
    expect(result.output.data).toMatchObject({ fallback: true })
  })

  it('throws when no upstream image URL is found', async () => {
    const executeProvider = mockProvider()
    await expect(runner.execute(makeCtx({ executeProvider }))).rejects.toThrow('no upstream image URL')
  })

  it('passes upstream image as attachment and returns image mediaType', async () => {
    const executeProvider = mockProvider({ url: 'https://cdn.example.com/transformed.png' })
    const upstreamOutputs = makeImageUpstream('https://cdn.example.com/source.png')
    const result = await runner.execute(makeCtx({ executeProvider, upstreamOutputs }))

    expect(executeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [{ kind: 'image', url: 'https://cdn.example.com/source.png' }],
      }),
    )
    expect(result.output.mediaType).toBe('image')
    expect(result.output.metadata).toMatchObject({ sourceImageUrl: 'https://cdn.example.com/source.png' })
  })

  it('throws when signal is aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const executeProvider = mockProvider()
    const upstreamOutputs = makeImageUpstream()
    await expect(runner.execute(makeCtx({ executeProvider, upstreamOutputs, signal: controller.signal }))).rejects.toThrow('Execution aborted')
  })
})

// ── SpeechToTextRunner ────────────────────────────────────────────────────────

describe('SpeechToTextRunner', () => {
  const runner = new SpeechToTextRunner()

  it('has nodeType = speech_to_text', () => {
    expect(runner.nodeType).toBe('speech_to_text')
  })

  it('returns fallback when no provider is wired', async () => {
    const upstreamOutputs = makeAudioUpstream()
    const result = await runner.execute(makeCtx({ upstreamOutputs }))

    expect(result.output.mediaType).toBe('text')
    expect(result.output.data).toMatchObject({ fallback: true })
  })

  it('throws when no upstream audio URL is found', async () => {
    const executeProvider = mockProvider()
    await expect(runner.execute(makeCtx({ executeProvider }))).rejects.toThrow('no upstream audio URL')
  })

  it('passes upstream audio as attachment and returns text mediaType', async () => {
    const executeProvider = vi.fn().mockResolvedValue({ mediaType: 'text', text: 'Transcribed text' })
    const upstreamOutputs = makeAudioUpstream('https://cdn.example.com/audio.mp3')
    const result = await runner.execute(makeCtx({ executeProvider, upstreamOutputs }))

    expect(executeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [{ kind: 'audio', url: 'https://cdn.example.com/audio.mp3' }],
      }),
    )
    expect(result.output.mediaType).toBe('text')
    expect(result.output.metadata).toMatchObject({ sourceAudioUrl: 'https://cdn.example.com/audio.mp3' })
  })

  it('throws when signal is aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const executeProvider = mockProvider()
    const upstreamOutputs = makeAudioUpstream()
    await expect(runner.execute(makeCtx({ executeProvider, upstreamOutputs, signal: controller.signal }))).rejects.toThrow('Execution aborted')
  })
})

// ── ImageUpscaleRunner ────────────────────────────────────────────────────────

describe('ImageUpscaleRunner', () => {
  const runner = new ImageUpscaleRunner()

  it('has nodeType = image_upscale', () => {
    expect(runner.nodeType).toBe('image_upscale')
  })

  it('returns fallback when no provider is wired', async () => {
    const upstreamOutputs = makeImageUpstream()
    const result = await runner.execute(makeCtx({ upstreamOutputs }))

    expect(result.output.mediaType).toBe('image')
    expect(result.output.data).toMatchObject({ fallback: true })
  })

  it('throws when no upstream image URL is found', async () => {
    const executeProvider = mockProvider()
    await expect(runner.execute(makeCtx({ executeProvider }))).rejects.toThrow('no upstream image URL')
  })

  it('passes scale param and upstream image, returns image mediaType', async () => {
    const executeProvider = mockProvider({ url: 'https://cdn.example.com/4x.png' })
    const upstreamOutputs = makeImageUpstream('https://cdn.example.com/original.png')
    const result = await runner.execute(makeCtx({ executeProvider, upstreamOutputs, nodeConfig: { scale: 4 } }))

    expect(executeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        params:      { scale: 4 },
        attachments: [{ kind: 'image', url: 'https://cdn.example.com/original.png' }],
      }),
    )
    expect(result.output.mediaType).toBe('image')
  })
})

// ── ImageToAudioRunner ────────────────────────────────────────────────────────

describe('ImageToAudioRunner', () => {
  const runner = new ImageToAudioRunner()

  it('has nodeType = image_to_audio', () => {
    expect(runner.nodeType).toBe('image_to_audio')
  })

  it('returns fallback when no provider is wired', async () => {
    const upstreamOutputs = makeImageUpstream()
    const result = await runner.execute(makeCtx({ upstreamOutputs }))

    expect(result.output.mediaType).toBe('audio')
    expect(result.output.data).toMatchObject({ fallback: true })
  })

  it('throws when no upstream image URL is found', async () => {
    const executeProvider = mockProvider()
    await expect(runner.execute(makeCtx({ executeProvider }))).rejects.toThrow('no upstream image URL')
  })

  it('passes image as attachment and returns audio mediaType', async () => {
    const executeProvider = vi.fn().mockResolvedValue({ mediaType: 'audio', url: 'https://cdn.example.com/sound.mp3' })
    const upstreamOutputs = makeImageUpstream('https://cdn.example.com/scene.png')
    const result = await runner.execute(makeCtx({ executeProvider, upstreamOutputs }))

    expect(result.output.mediaType).toBe('audio')
    expect(result.output.metadata).toMatchObject({ sourceImageUrl: 'https://cdn.example.com/scene.png' })
  })
})

// ── MediaConvertRunner ────────────────────────────────────────────────────────

describe('MediaConvertRunner', () => {
  const runner = new MediaConvertRunner()

  it('has nodeType = media_convert', () => {
    expect(runner.nodeType).toBe('media_convert')
  })

  it('throws NotImplementedError (no conversion service wired)', async () => {
    await expect(runner.execute(makeCtx())).rejects.toThrow('media_convert: no conversion service wired')
  })
})

// ── Cross-cutting ─────────────────────────────────────────────────────────────

describe('Media runners — nodeType uniqueness', () => {
  const runners = [
    new TextToImageRunner(),
    new TextToSpeechRunner(),
    new SpeechToTextRunner(),
    new ImageToImageRunner(),
    new TextToVideoRunner(),
    new ImageUpscaleRunner(),
    new MediaConvertRunner(),
    new ImageToAudioRunner(),
  ]

  it('all runners have unique nodeType values', () => {
    const types = runners.map((r) => r.nodeType)
    expect(new Set(types).size).toBe(runners.length)
  })

  it('text-input runners return correct mediaType from fallback', async () => {
    const textInputRunners = [
      { runner: new TextToImageRunner(), expected: 'image' },
      { runner: new TextToSpeechRunner(), expected: 'audio' },
      { runner: new TextToVideoRunner(), expected: 'video' },
    ]
    for (const { runner, expected } of textInputRunners) {
      const result = await runner.execute(makeCtx())
      expect(result.output.mediaType).toBe(expected)
    }
  })

  it('upstream-input runners throw when context has no upstream data and a provider', async () => {
    const upstreamRunners = [
      new ImageToImageRunner(),
      new ImageToAudioRunner(),
      new ImageUpscaleRunner(),
    ]
    for (const runner of upstreamRunners) {
      const executeProvider = vi.fn().mockResolvedValue({ mediaType: 'image', url: 'https://x.com/img.png' })
      await expect(runner.execute(makeCtx({ executeProvider }))).rejects.toThrow()
    }
    const executeProvider = vi.fn().mockResolvedValue({ mediaType: 'text', text: 'hi' })
    await expect(new SpeechToTextRunner().execute(makeCtx({ executeProvider }))).rejects.toThrow()
  })
})
