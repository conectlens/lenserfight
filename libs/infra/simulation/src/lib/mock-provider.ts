// MockProvider — deterministic fixtures for the simulation engine.
//
// The mock provider exposes the same `IExecutionProvider` / streaming shape
// as the real providers so the simulator can drive the full kernel without
// any network calls. Outputs are keyed by `(lensKind, nodeId)` so repeated
// runs yield byte-identical envelopes — a prerequisite for the
// determinism contract in Phase 5 §Simulation Engine.

import type {
  ExecutionInput,
  ExecutionResult,
  IExecutionProvider,
  IStreamingExecutionProvider,
  MediaType,
  StreamChunk,
} from '@lenserfight/infra/execution'
import type { LensKind, NodeOutputEnvelope } from '@lenserfight/types'

export interface MockFixture {
  text?: string
  url?: string
  mime?: string
  data?: Record<string, unknown>
}

export interface MockProviderOptions {
  /** Per-node overrides keyed by node id. */
  byNodeId?: Record<string, MockFixture>
  /** Per-lens-kind defaults. */
  byKind?: Partial<Record<LensKind, MockFixture>>
  /** Optional hard upper bound on synthetic latency used by `simulate()`. */
  defaultDurationMs?: number
}

const KIND_DEFAULT_TEXT: Record<LensKind, string> = {
  text: '[sim] sample text output',
  image: '[sim] https://example.invalid/image.png',
  video: '[sim] https://example.invalid/video.mp4',
  audio: '[sim] https://example.invalid/audio.mp3',
  music: '[sim] https://example.invalid/music.mp3',
  research: '[sim] synthesised findings',
  pdf: '[sim] https://example.invalid/export.pdf',
  transform: '[sim] transformed payload',
  orchestration: '[sim] subflow plan',
  validation: '[sim] validation pass',
  routing: '[sim] default_route',
}

/**
 * Deterministic IExecutionProvider for simulation. Exposes `stream()` as well
 * so the full streaming path can be exercised without a provider SDK.
 */
export class MockProvider implements IExecutionProvider, IStreamingExecutionProvider {
  readonly id = 'mock'
  readonly supportedMediaTypes: MediaType[] = ['text', 'image', 'audio', 'video']

  constructor(private readonly options: MockProviderOptions = {}) {}

  async execute(
    modelId: string,
    _input: ExecutionInput,
    _signal?: AbortSignal,
  ): Promise<ExecutionResult> {
    const { fixture } = this.pickFixture(modelId)
    return {
      mediaType: fixture.url ? 'image' : 'text',
      text: fixture.text,
      url: fixture.url,
      mimeType: fixture.mime,
      durationMs: this.options.defaultDurationMs ?? 50,
      metadata: { sim: true, ...(fixture.data ? { data: fixture.data } : {}) },
    }
  }

  async *stream(
    modelId: string,
    _input: ExecutionInput,
    _signal?: AbortSignal,
  ): AsyncIterable<StreamChunk> {
    const { fixture } = this.pickFixture(modelId)
    const text = fixture.text ?? ''
    // Emit a handful of partials so delta ordering can be exercised.
    const step = Math.max(1, Math.ceil(text.length / 4))
    for (let i = 0; i < text.length; i += step) {
      yield { type: 'partial', text: text.slice(i, i + step) }
    }
    const envelope: NodeOutputEnvelope = {
      kind: 'text',
      artifactKind: 'text',
      output: text,
      data: fixture.data,
      metadata: { sim: true },
    }
    yield { type: 'final', envelope }
  }

  /**
   * Resolve a fixture for a given node. The `modelId` passed by the engine is
   * the node's `lensId`, so we use it as the primary key. Falls back to the
   * lens-kind default, finally to the text default.
   */
  pickFixture(lookupKey: string, kind: LensKind = 'text'): { fixture: MockFixture } {
    const byNode = this.options.byNodeId?.[lookupKey]
    if (byNode) return { fixture: byNode }
    const byKind = this.options.byKind?.[kind]
    if (byKind) return { fixture: byKind }
    return { fixture: { text: KIND_DEFAULT_TEXT[kind] ?? KIND_DEFAULT_TEXT.text } }
  }
}
