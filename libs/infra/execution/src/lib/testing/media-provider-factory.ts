import { vi, type MockInstance } from 'vitest'
import type { AsyncGenerationResponse, GenerativeMediaResult } from '@lenserfight/providers'

// ─── Result builders ─────────────────────────────────────────────────────────

export function makePendingResult(taskId: string): AsyncGenerationResponse {
  return { status: 'pending', taskId }
}

export function makeCompletedImageResult(
  url: string,
  w?: number,
  h?: number,
): GenerativeMediaResult {
  return {
    status: 'completed',
    urls: [url],
    mimeType: 'image/png',
    ...(w != null && h != null ? { width: w, height: h } : {}),
  }
}

export function makeCompletedVideoResult(
  url: string,
  durationSeconds?: number,
): GenerativeMediaResult {
  return {
    status: 'completed',
    urls: [url],
    mimeType: 'video/mp4',
    ...(durationSeconds != null ? { durationSeconds } : {}),
  }
}

export function makeCompletedAudioResult(
  url: string,
  durationSeconds?: number,
): GenerativeMediaResult {
  return {
    status: 'completed',
    urls: [url],
    mimeType: 'audio/mpeg',
    ...(durationSeconds != null ? { durationSeconds } : {}),
  }
}

// ─── Fetch mock helpers ──────────────────────────────────────────────────────

export interface FetchMockRoute {
  url: RegExp
  response: object
  status?: number
}

export function mockFetch(routes: FetchMockRoute[]): MockInstance {
  return vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    const route = routes.find((r) => r.url.test(url))
    if (!route) {
      return Promise.reject(new Error(`mockFetch: no route matched "${url}"`))
    }
    const status = route.status ?? 200
    return Promise.resolve(
      new Response(JSON.stringify(route.response), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })
}

export function resetFetchMock(spy: MockInstance): void {
  spy.mockRestore()
}
