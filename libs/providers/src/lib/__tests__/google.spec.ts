/**
 * Google Gemini text-adapter contract.
 *
 * Distinctive: API key goes in the URL query string, NOT in a header.
 * `authHeader` returns `{}` deliberately. The SSE stream endpoint differs
 * from the non-stream endpoint (`:streamGenerateContent?alt=sse`).
 */

import { callProvider, streamProvider } from '../../index'
import * as google from '../google'
import type { ProviderMessage } from '../types'
import { ProviderRequestRecorder } from '../testing/provider-request-recorder'

describe('google gemini text adapter — contract', () => {
  const recorder = new ProviderRequestRecorder()
  beforeEach(() => recorder.install())
  afterEach(() => { recorder.uninstall(); recorder.reset() })

  describe('authHeader', () => {
    it('returns empty record — key goes in URL', () => {
      expect(google.authHeader('AIzaXXX')).toEqual({})
    })
  })

  describe('buildUrl', () => {
    it('embeds the model and key in v1beta generateContent URL', () => {
      const url = google.buildUrl('gemini-2.5-flash', 'AIzaXXX')
      expect(url).toContain('/v1beta/models/gemini-2.5-flash:generateContent')
      expect(url).toContain('key=AIzaXXX')
    })
  })

  describe('buildStreamUrl', () => {
    it('uses streamGenerateContent with alt=sse', () => {
      const url = google.buildStreamUrl('gemini-2.5-flash', 'AIzaXXX')
      expect(url).toContain(':streamGenerateContent')
      expect(url).toContain('alt=sse')
      expect(url).toContain('key=AIzaXXX')
    })
  })

  describe('transformRequest', () => {
    it('separates system messages into system_instruction', () => {
      const messages: ProviderMessage[] = [
        { role: 'system', content: 'you are helpful' },
        { role: 'user', content: 'hi' },
      ]
      const body = JSON.parse(google.transformRequest('gemini-2.5-flash', messages, {}).body)
      expect(body.system_instruction.parts).toEqual([{ text: 'you are helpful' }])
      expect(body.contents).toHaveLength(1)
      expect(body.contents[0]).toEqual({ role: 'user', parts: [{ text: 'hi' }] })
    })

    it('maps assistant role to model role', () => {
      const messages: ProviderMessage[] = [
        { role: 'assistant', content: 'previous answer' },
        { role: 'user', content: 'follow-up' },
      ]
      const body = JSON.parse(google.transformRequest('gemini-2.5-flash', messages, {}).body)
      expect(body.contents[0].role).toBe('model')
      expect(body.contents[1].role).toBe('user')
    })

    it('converts image parts to fileData with mimeType + fileUri', () => {
      const messages: ProviderMessage[] = [{
        role: 'user',
        content: [
          { type: 'text', text: 'look' },
          { type: 'image', url: 'https://x/y.png', mimeType: 'image/png' },
        ],
      }]
      const body = JSON.parse(google.transformRequest('gemini-2.5-pro', messages, {}).body)
      expect(body.contents[0].parts).toEqual([
        { text: 'look' },
        { fileData: { mimeType: 'image/png', fileUri: 'https://x/y.png' } },
      ])
    })

    it('defaults image mimeType to image/jpeg when not provided', () => {
      const messages: ProviderMessage[] = [{
        role: 'user',
        content: [{ type: 'image', url: 'https://x/y' }],
      }]
      const body = JSON.parse(google.transformRequest('gemini-2.5-pro', messages, {}).body)
      expect(body.contents[0].parts[0].fileData.mimeType).toBe('image/jpeg')
    })

    it('emits generationConfig when maxTokens or temperature is set', () => {
      const body = JSON.parse(
        google.transformRequest('gemini-2.5-flash', [{ role: 'user', content: 'hi' }], {
          maxTokens: 256,
          temperature: 0.2,
        }).body,
      )
      expect(body.generationConfig).toEqual({ maxOutputTokens: 256, temperature: 0.2 })
    })

    it('omits generationConfig entirely when no options provided', () => {
      const body = JSON.parse(
        google.transformRequest('gemini-2.5-flash', [{ role: 'user', content: 'hi' }], {}).body,
      )
      expect(body).not.toHaveProperty('generationConfig')
    })
  })

  describe('transformResponse', () => {
    it('extracts text from candidates[0].content.parts[0].text', () => {
      const result = google.transformResponse({
        candidates: [{ content: { parts: [{ text: 'gemini says hi' }] } }],
        usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 24 },
      } as never)
      expect(result.content).toBe('gemini says hi')
      expect(result.usage).toEqual({ input_tokens: 12, output_tokens: 24 })
    })

    it('returns empty content / zero tokens when usageMetadata absent but candidates present', () => {
      const result = google.transformResponse({
        candidates: [{ content: { parts: [] } }],
      } as never)
      expect(result.content).toBe('')
      expect(result.usage).toEqual({ input_tokens: 0, output_tokens: 0 })
    })

    it('returns empty content when candidates[0].content.parts is empty', () => {
      const result = google.transformResponse({
        candidates: [{ content: { parts: [] } }],
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
      } as never)
      expect(result.content).toBe('')
    })
  })

  describe('end-to-end via callProvider', () => {
    it('puts the API key in the URL, not in any header', async () => {
      recorder.queueResponse({
        body: {
          candidates: [{ content: { parts: [{ text: 'hi' }] } }],
          usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
        },
      })
      await callProvider('google', 'AIza123', 'gemini-2.5-flash', [
        { role: 'user', content: 'ping' },
      ])
      const req = recorder.lastRequest
      expect(req?.url).toContain('key=AIza123')
      expect(req?.headers['authorization']).toBeUndefined()
      expect(req?.headers['x-api-key']).toBeUndefined()
    })
  })

  describe('streamProvider URL routing', () => {
    it('streamProvider uses the streamGenerateContent URL', async () => {
      recorder.queueResponse({ status: 200, body: '' })
      try {
        await streamProvider('google', 'AIza123', 'gemini-2.5-flash', [
          { role: 'user', content: 'ping' },
        ])
      } catch {
        // empty body may cause downstream errors — we just need the URL.
      }
      const req = recorder.lastRequest
      expect(req?.url).toContain(':streamGenerateContent')
      expect(req?.url).toContain('alt=sse')
    })
  })
})
