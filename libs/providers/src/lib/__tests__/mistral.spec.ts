/**
 * Mistral text-adapter contract.
 *
 * Mistral's chat completions API is OpenAI-compatible at the wire level.
 * Bearer auth header + JSON body. SSE stream uses the same [DONE] sentinel.
 */

import { callProvider } from '../../index'
import * as mistral from '../mistral'
import type { ProviderMessage } from '../types'
import { ProviderRequestRecorder } from '../testing/provider-request-recorder'

describe('mistral text adapter — contract', () => {
  const recorder = new ProviderRequestRecorder()
  beforeEach(() => recorder.install())
  afterEach(() => { recorder.uninstall(); recorder.reset() })

  describe('authHeader', () => {
    it('returns Bearer token', () => {
      expect(mistral.authHeader('mst-xxx')).toEqual({ Authorization: 'Bearer mst-xxx' })
    })
  })

  describe('transformRequest', () => {
    it('builds /v1/chat/completions URL with Content-Type JSON', () => {
      const built = mistral.transformRequest('mistral-large-3', [
        { role: 'user', content: 'hi' },
      ], {})
      expect(built.url).toBe('https://api.mistral.ai/v1/chat/completions')
      expect(built.headers).toEqual({ 'Content-Type': 'application/json' })
    })

    it('includes max_tokens / temperature / tools when provided', () => {
      const body = JSON.parse(mistral.transformRequest('mistral-large-3', [
        { role: 'user', content: 'hi' },
      ], { maxTokens: 200, temperature: 0.1, tools: [{ name: 't' }] }).body)
      expect(body.max_tokens).toBe(200)
      expect(body.temperature).toBe(0.1)
      expect(body.tools).toEqual([{ name: 't' }])
    })

    it('converts image parts to image_url content blocks', () => {
      const messages: ProviderMessage[] = [{
        role: 'user',
        content: [{ type: 'image', url: 'https://x/y.png' }],
      }]
      const body = JSON.parse(mistral.transformRequest('mistral-large-3', messages, {}).body)
      expect(body.messages[0].content).toEqual([
        { type: 'image_url', image_url: { url: 'https://x/y.png' } },
      ])
    })

    it('embeds document URLs as text fallback', () => {
      const messages: ProviderMessage[] = [{
        role: 'user',
        content: [{ type: 'document', url: 'https://x/y.pdf', mimeType: 'application/pdf' }],
      }]
      const body = JSON.parse(mistral.transformRequest('mistral-large-3', messages, {}).body)
      expect(body.messages[0].content[0].text).toMatch(/Document.*https:\/\/x\/y\.pdf/)
    })
  })

  describe('transformResponse', () => {
    it('extracts content from choices[0].message.content', () => {
      const result = mistral.transformResponse({
        choices: [{ message: { content: 'mistral says hi' } }],
        usage: { prompt_tokens: 4, completion_tokens: 8 },
      } as never)
      expect(result.content).toBe('mistral says hi')
      expect(result.usage).toEqual({ input_tokens: 4, output_tokens: 8 })
    })
  })

  describe('buildStreamRequest', () => {
    it('sets stream:true (but NOT stream_options — Mistral diff from OpenAI)', () => {
      const body = JSON.parse(
        mistral.buildStreamRequest('mistral-large-3', [{ role: 'user', content: 'hi' }], {}).body,
      )
      expect(body.stream).toBe(true)
      expect(body).not.toHaveProperty('stream_options')
    })
  })

  describe('end-to-end via callProvider', () => {
    it('reaches https://api.mistral.ai with Bearer auth', async () => {
      recorder.queueResponse({
        body: {
          choices: [{ message: { content: 'pong' } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        },
      })
      await callProvider('mistral', 'mst-test', 'mistral-large-3', [
        { role: 'user', content: 'ping' },
      ])
      const req = recorder.lastRequest
      expect(req?.url).toBe('https://api.mistral.ai/v1/chat/completions')
      expect(req?.headers['authorization']).toBe('Bearer mst-test')
    })
  })
})
