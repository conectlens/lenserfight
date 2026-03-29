/**
 * ReplayStrategy — polymorphic replay behavior per content type.
 *
 * GRASP: Polymorphism — different content types replay differently.
 * Text replays progressively (typewriter), media reveals on completion.
 */
import type { StreamEvent } from '../types/battle-execution.types'

export interface ReplayFrame {
  text?: string
  url?: string
  isComplete: boolean
}

export interface ReplayStrategy {
  contentType: string
  buildOutput(events: StreamEvent[], positionMs: number): ReplayFrame
  supportsProgressive: boolean
}

// --- Text Replay ---

export class TextReplayStrategy implements ReplayStrategy {
  contentType = 'text'
  supportsProgressive = true

  buildOutput(events: StreamEvent[], positionMs: number): ReplayFrame {
    let text = ''
    let isComplete = false
    for (const event of events) {
      if (event.t > positionMs) break
      if (event.k === 't' && event.d) text += event.d
      if (event.k === 'e') isComplete = true
    }
    return { text, isComplete }
  }
}

// --- Image Replay ---

export class ImageReplayStrategy implements ReplayStrategy {
  contentType = 'image'
  supportsProgressive = false

  buildOutput(events: StreamEvent[], positionMs: number): ReplayFrame {
    for (const event of events) {
      if (event.t > positionMs) break
      if (event.k === 'e' && event.m?.url) {
        return { url: event.m.url as string, isComplete: true }
      }
    }
    return { isComplete: false }
  }
}

// --- Audio Replay ---

export class AudioReplayStrategy implements ReplayStrategy {
  contentType = 'audio'
  supportsProgressive = false

  buildOutput(events: StreamEvent[], positionMs: number): ReplayFrame {
    for (const event of events) {
      if (event.t > positionMs) break
      if (event.k === 'e' && event.m?.url) {
        return { url: event.m.url as string, isComplete: true }
      }
    }
    return { isComplete: false }
  }
}

// --- Video Replay ---

export class VideoReplayStrategy implements ReplayStrategy {
  contentType = 'video'
  supportsProgressive = false

  buildOutput(events: StreamEvent[], positionMs: number): ReplayFrame {
    for (const event of events) {
      if (event.t > positionMs) break
      if (event.k === 'e' && event.m?.url) {
        return { url: event.m.url as string, isComplete: true }
      }
    }
    return { isComplete: false }
  }
}

// --- Strategy Registry ---

const strategies: Record<string, ReplayStrategy> = {
  text: new TextReplayStrategy(),
  code: new TextReplayStrategy(),
  poem: new TextReplayStrategy(),
  image: new ImageReplayStrategy(),
  avatar: new ImageReplayStrategy(),
  image_edit: new ImageReplayStrategy(),
  drawing: new ImageReplayStrategy(),
  audio: new AudioReplayStrategy(),
  video: new VideoReplayStrategy(),
}

export function getReplayStrategy(contentType: string): ReplayStrategy {
  return strategies[contentType] ?? strategies.text
}
