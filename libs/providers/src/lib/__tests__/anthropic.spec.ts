/**
 * Anthropic text-adapter contract.
 *
 * Proves Claude messages request shape:
 *   - `x-api-key` auth header
 *   - `anthropic-version: 2023-06-01` header always set
 *   - system messages lift to top-level `system` field, NOT inside `messages`
 *   - max_tokens defaults to 4096 when caller omits it
 *   - image/document parts mapped to source.{type:'url'} blocks
 */

import { callProvider } from '../../index'
import * as anthropic from '../anthropic'
import type { ProviderMessage } from '../types'
import { ProviderRequestRecorder } from '../testing/provider-request-recorder'

describe('anthropic text adapter — contract', () => {
  const recorder = new ProviderRequestRecorder()
  beforeEach(() => recorder.install())
  afterEach(() => { recorder.uninstall(); recorder.reset() })

  describe('authHeader', () => {
    it('returns x-api-key header (NOT Bearer)', () => {
      expect(anthropic.authHeader('sk-ant-xxx')).toEqual({ 'x-api-key': 'sk-ant-xxx' })
    })
  })

  describe('transformRequest', () => {
    it('builds /v1/messages URL with anthropic-version header', () => {
      const built = anthropic.transformRequest('claude-haiku-4-5', [
        { role: 'user', content: 'hi' },
      ], {})
      expect(built.url).toBe('https://api.anthropic.com/v1/messages')
      expect(built.headers['anthropic-version']).toBe('2023-06-01')
      expect(built.headers['Content-Type']).toBe('application/json')
    })

    it('defaults max_tokens to 4096', () => {
      const body = JSON.parse(
        anthropic.transformRequest('claude-haiku-4-5', [{ role: 'user', content: 'hi' }], {}).body,
      )
      expect(body.max_tokens).toBe(4096)
    })

    it('overrides max_tokens when caller supplies it', () => {
      const body = JSON.parse(
        anthropic.transformRequest('claude-haiku-4-5', [{ role: 'user', content: 'hi' }], {
          maxTokens: 256,
        }).body,
      )
      expect(body.max_tokens).toBe(256)
    })

    it('lifts system messages to top-level system field', () => {
      const messages: ProviderMessage[] = [
        { role: 'system', content: 'you are helpful' },
        { role: 'user', content: 'hi' },
      ]
      const body = JSON.parse(anthropic.transformRequest('claude-haiku-4-5', messages, {}).body)
      expect(body.system).toBe('you are helpful')
      expect(body.messages).toHaveLength(1)
      expect(body.messages[0].role).toBe('user')
    })

    it('joins multi-part system content into a single string', () => {
      const messages: ProviderMessage[] = [
        { role: 'system', content: [{ type: 'text', text: 'rule 1' }, { type: 'text', text: 'rule 2' }] },
        { role: 'user', content: 'hi' },
      ]
      const body = JSON.parse(anthropic.transformRequest('claude-haiku-4-5', messages, {}).body)
      expect(body.system).toBe('rule 1\nrule 2')
    })

    it('converts image parts to source.{type:url}', () => {
      const messages: ProviderMessage[] = [{
        role: 'user',
        content: [
          { type: 'text', text: 'see this' },
          { type: 'image', url: 'https://x/y.jpg', mimeType: 'image/jpeg' },
        ],
      }]
      const body = JSON.parse(anthropic.transformRequest('claude-opus-4', messages, {}).body)
      expect(body.messages[0].content).toEqual([
        { type: 'text', text: 'see this' },
        { type: 'image', source: { type: 'url', url: 'https://x/y.jpg', media_type: 'image/jpeg' } },
      ])
    })

    it('converts document parts to document blocks with media_type', () => {
      const messages: ProviderMessage[] = [{
        role: 'user',
        content: [{ type: 'document', url: 'https://x/y.pdf', mimeType: 'application/pdf' }],
      }]
      const body = JSON.parse(anthropic.transformRequest('claude-opus-4', messages, {}).body)
      expect(body.messages[0].content[0]).toMatchObject({
        type: 'document',
        source: { type: 'url', url: 'https://x/y.pdf', media_type: 'application/pdf' },
      })
    })
  })

  describe('transformResponse', () => {
    it('extracts text from the first text content block', () => {
      const result = anthropic.transformResponse({
        content: [{ type: 'text', text: 'claude says hi' }],
        usage: { input_tokens: 5, output_tokens: 10 },
      } as never)
      expect(result.content).toBe('claude says hi')
      expect(result.usage).toEqual({ input_tokens: 5, output_tokens: 10 })
    })

    it('returns empty string when no text block exists', () => {
      const result = anthropic.transformResponse({
        content: [{ type: 'tool_use', text: '' }],
        usage: { input_tokens: 1, output_tokens: 0 },
      } as never)
      expect(result.content).toBe('')
    })
  })

  describe('buildStreamRequest', () => {
    it('sets stream:true in the body', () => {
      const body = JSON.parse(
        anthropic.buildStreamRequest('claude-haiku-4-5', [{ role: 'user', content: 'hi' }], {}).body,
      )
      expect(body.stream).toBe(true)
    })
  })

  describe('end-to-end via callProvider', () => {
    it('uses x-api-key (not Authorization Bearer)', async () => {
      recorder.queueResponse({
        body: {
          content: [{ type: 'text', text: 'hi' }],
          usage: { input_tokens: 1, output_tokens: 1 },
        },
      })
      await callProvider('anthropic', 'sk-ant-test', 'claude-haiku-4-5', [
        { role: 'user', content: 'ping' },
      ])
      const req = recorder.lastRequest
      expect(req?.headers['x-api-key']).toBe('sk-ant-test')
      expect(req?.headers['authorization']).toBeUndefined()
    })
  })
})
