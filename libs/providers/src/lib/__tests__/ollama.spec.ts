/**
 * Ollama local-adapter contract.
 *
 * Distinctive: defaults to http://localhost:11434, accepts `LENSERFIGHT_OLLAMA_BASE_URL`
 * env override. Auth header is empty for local; Bearer when an apiKey is supplied
 * (cloud variant). Stream is NDJSON, not SSE — `parseStreamChunk` skips
 * `data:` prefix detection.
 */

import * as ollama from '../ollama'
import type { ProviderMessage } from '../types'

describe('ollama adapter — contract', () => {
  describe('resolveOllamaBaseUrl', () => {
    const original = process.env['LENSERFIGHT_OLLAMA_BASE_URL']
    afterEach(() => {
      if (original === undefined) delete process.env['LENSERFIGHT_OLLAMA_BASE_URL']
      else process.env['LENSERFIGHT_OLLAMA_BASE_URL'] = original
    })

    it('defaults to http://localhost:11434 when no env / argument', () => {
      delete process.env['LENSERFIGHT_OLLAMA_BASE_URL']
      expect(ollama.resolveOllamaBaseUrl()).toBe('http://localhost:11434')
    })

    it('honours an explicit argument over env', () => {
      process.env['LENSERFIGHT_OLLAMA_BASE_URL'] = 'http://env-host:9999'
      expect(ollama.resolveOllamaBaseUrl('http://arg-host:8000')).toBe('http://arg-host:8000')
    })

    it('reads LENSERFIGHT_OLLAMA_BASE_URL when no argument', () => {
      process.env['LENSERFIGHT_OLLAMA_BASE_URL'] = 'http://env-host:9999/'
      expect(ollama.resolveOllamaBaseUrl()).toBe('http://env-host:9999')
    })

    it('strips trailing slash', () => {
      expect(ollama.resolveOllamaBaseUrl('http://x/')).toBe('http://x')
    })
  })

  describe('authHeader', () => {
    it('returns empty record for local (no key)', () => {
      expect(ollama.authHeader('')).toEqual({})
    })

    it('returns Bearer when an apiKey is passed (cloud variant)', () => {
      expect(ollama.authHeader('sk-ollama-cloud')).toEqual({
        Authorization: 'Bearer sk-ollama-cloud',
      })
    })
  })

  describe('transformRequest', () => {
    it('builds /api/chat URL against the resolved base', () => {
      const built = ollama.transformRequest(
        'llama3.2',
        [{ role: 'user', content: 'hi' }],
        {},
        'http://localhost:11434',
      )
      expect(built.url).toBe('http://localhost:11434/api/chat')
    })

    it('sets stream:false on the non-stream variant', () => {
      const body = JSON.parse(
        ollama.transformRequest('llama3.2', [{ role: 'user', content: 'hi' }], {}).body,
      )
      expect(body.stream).toBe(false)
    })

    it('puts max tokens under options.num_predict (not max_tokens)', () => {
      const body = JSON.parse(
        ollama.transformRequest('llama3.2', [{ role: 'user', content: 'hi' }], {
          maxTokens: 256,
          temperature: 0.3,
        }).body,
      )
      expect(body.options).toEqual({ num_predict: 256, temperature: 0.3 })
    })

    it('omits options block when no max/temperature provided', () => {
      const body = JSON.parse(
        ollama.transformRequest('llama3.2', [{ role: 'user', content: 'hi' }], {}).body,
      )
      expect(body).not.toHaveProperty('options')
    })

    it('image parts move to a sibling images array (not in content)', () => {
      const messages: ProviderMessage[] = [{
        role: 'user',
        content: [
          { type: 'text', text: 'describe' },
          { type: 'image', url: 'iVBORw0base64' },
        ],
      }]
      const body = JSON.parse(ollama.transformRequest('llama3.2', messages, {}).body)
      expect(body.messages[0].content).toBe('describe')
      expect(body.messages[0].images).toEqual(['iVBORw0base64'])
    })

    it('uses "." placeholder content when only images are present', () => {
      const messages: ProviderMessage[] = [{
        role: 'user',
        content: [{ type: 'image', url: 'iVBORw0' }],
      }]
      const body = JSON.parse(ollama.transformRequest('llama3.2', messages, {}).body)
      expect(body.messages[0].content).toBe('.')
    })
  })

  describe('transformResponse', () => {
    it('extracts message.content and maps usage tokens', () => {
      const result = ollama.transformResponse({
        message: { content: 'ollama says hi' },
        prompt_eval_count: 7,
        eval_count: 13,
        done: true,
      } as never)
      expect(result.content).toBe('ollama says hi')
      expect(result.usage).toEqual({ input_tokens: 7, output_tokens: 13 })
    })

    it('returns 0/0 tokens when counts absent', () => {
      const result = ollama.transformResponse({
        message: { content: 'x' },
        done: true,
      } as never)
      expect(result.usage).toEqual({ input_tokens: 0, output_tokens: 0 })
    })
  })

  describe('buildStreamRequest', () => {
    it('sets stream:true', () => {
      const body = JSON.parse(
        ollama.buildStreamRequest('llama3.2', [{ role: 'user', content: 'hi' }], {}).body,
      )
      expect(body.stream).toBe(true)
    })
  })

  describe('OLLAMA_DEFAULT_BASE_URL export', () => {
    it('exports a non-empty string', () => {
      expect(typeof ollama.OLLAMA_DEFAULT_BASE_URL).toBe('string')
      expect(ollama.OLLAMA_DEFAULT_BASE_URL.length).toBeGreaterThan(0)
    })
  })
})
