/**
 * OpenAI text-adapter contract.
 *
 * Proves the request shape OpenAI's `/v1/chat/completions` endpoint accepts:
 *   - Bearer auth header
 *   - JSON body with `model`, `messages`, optional `max_tokens`/`temperature`/`tools`
 *   - Streaming variant sets `stream: true` and `stream_options.include_usage: true`
 *   - Image parts converted to `image_url` content blocks
 *   - Response parsing pulls `choices[0].message.content` + `usage` token counts
 */

import { callProvider } from '../../index'
import * as openai from '../openai'
import type { ProviderMessage } from '../types'
import { ProviderRequestRecorder } from '../testing/provider-request-recorder'

describe('openai text adapter — contract', () => {
  const recorder = new ProviderRequestRecorder()
  beforeEach(() => recorder.install())
  afterEach(() => { recorder.uninstall(); recorder.reset() })

  describe('authHeader', () => {
    it('returns Bearer token', () => {
      expect(openai.authHeader('sk-foo')).toEqual({ Authorization: 'Bearer sk-foo' })
    })
  })

  describe('transformRequest', () => {
    it('builds the /v1/chat/completions URL and stringified body', () => {
      const built = openai.transformRequest('gpt-4o', [{ role: 'user', content: 'hi' }], {})
      expect(built.url).toBe('https://api.openai.com/v1/chat/completions')
      expect(built.headers).toEqual({ 'Content-Type': 'application/json' })
      const body = JSON.parse(built.body)
      expect(body).toMatchObject({ model: 'gpt-4o' })
      expect(body.messages).toEqual([{ role: 'user', content: 'hi' }])
    })

    it('includes max_tokens / temperature / tools when provided', () => {
      const built = openai.transformRequest('gpt-4o', [{ role: 'user', content: 'hi' }], {
        maxTokens: 100,
        temperature: 0.4,
        tools: [{ name: 'search' }],
      })
      const body = JSON.parse(built.body)
      expect(body.max_tokens).toBe(100)
      expect(body.temperature).toBe(0.4)
      expect(body.tools).toEqual([{ name: 'search' }])
    })

    it('omits optional fields when not provided', () => {
      const built = openai.transformRequest('gpt-4o', [{ role: 'user', content: 'hi' }], {})
      const body = JSON.parse(built.body)
      expect(body).not.toHaveProperty('max_tokens')
      expect(body).not.toHaveProperty('temperature')
      expect(body).not.toHaveProperty('tools')
    })

    it('converts image parts to image_url content blocks', () => {
      const messages: ProviderMessage[] = [{
        role: 'user',
        content: [
          { type: 'text', text: 'what is in this image?' },
          { type: 'image', url: 'https://x/y.png', detail: 'high' },
        ],
      }]
      const body = JSON.parse(openai.transformRequest('gpt-4o', messages, {}).body)
      expect(body.messages[0].content).toEqual([
        { type: 'text', text: 'what is in this image?' },
        { type: 'image_url', image_url: { url: 'https://x/y.png', detail: 'high' } },
      ])
    })

    it('falls back to text note for unsupported attachment kinds', () => {
      const messages: ProviderMessage[] = [{
        role: 'user',
        content: [
          { type: 'audio', url: 'https://x/y.mp3', mimeType: 'audio/mpeg' },
        ],
      }]
      const body = JSON.parse(openai.transformRequest('gpt-4o', messages, {}).body)
      expect(body.messages[0].content[0].text).toMatch(/audio/)
    })
  })

  describe('transformResponse', () => {
    it('extracts content from choices[0].message.content', () => {
      const result = openai.transformResponse({
        choices: [{ message: { content: 'hello world' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      } as never)
      expect(result.content).toBe('hello world')
    })

    it('maps usage tokens to input_tokens/output_tokens', () => {
      const result = openai.transformResponse({
        choices: [{ message: { content: 'x' } }],
        usage: { prompt_tokens: 3, completion_tokens: 7 },
      } as never)
      expect(result.usage).toEqual({ input_tokens: 3, output_tokens: 7 })
    })

    it('returns empty string when choices[0].message.content is missing', () => {
      const result = openai.transformResponse({
        choices: [],
        usage: { prompt_tokens: 0, completion_tokens: 0 },
      } as never)
      expect(result.content).toBe('')
    })
  })

  describe('buildStreamRequest', () => {
    it('adds stream:true and stream_options.include_usage:true', () => {
      const built = openai.buildStreamRequest('gpt-4o', [{ role: 'user', content: 'hi' }], {})
      const body = JSON.parse(built.body)
      expect(body.stream).toBe(true)
      expect(body.stream_options).toEqual({ include_usage: true })
    })
  })

  describe('end-to-end via callProvider', () => {
    it('routes through openai adapter, parses the response', async () => {
      recorder.queueResponse({
        body: {
          choices: [{ message: { content: 'pong' } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        },
      })
      const result = await callProvider('openai', 'sk-test', 'gpt-4o', [
        { role: 'user', content: 'ping' },
      ])
      expect(result.content).toBe('pong')
      const req = recorder.lastRequest
      expect(req?.url).toBe('https://api.openai.com/v1/chat/completions')
      expect(req?.headers['authorization']).toBe('Bearer sk-test')
    })
  })
})
