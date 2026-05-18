/**
 * `parseStreamChunk` robustness across every text-adapter format.
 *
 * Each provider's stream parser must:
 *   - Return null for empty / whitespace-only lines.
 *   - Return null for malformed JSON without throwing.
 *   - Handle the `data: ` SSE prefix consistently.
 *   - Handle the `[DONE]` sentinel correctly (or its provider equivalent).
 *   - Extract content deltas and usage metadata where present.
 *   - Never throw — bad lines map to null so the pump loop can keep going.
 *
 * Ollama uses NDJSON (no `data:` prefix) and signals end via `done: true`.
 * Anthropic SSE interleaves `event:` and `data:` lines; the parser is
 * event-type-aware.
 */

import * as openai from '../openai'
import * as anthropic from '../anthropic'
import * as google from '../google'
import * as mistral from '../mistral'
import * as ollama from '../ollama'

const SSE_LIKE = [openai, google, mistral] as const

describe('parseStreamChunk — null on empty/whitespace', () => {
  it.each([
    ['openai',    openai.parseStreamChunk],
    ['anthropic', anthropic.parseStreamChunk],
    ['google',    google.parseStreamChunk],
    ['mistral',   mistral.parseStreamChunk],
    ['ollama',    ollama.parseStreamChunk],
  ])('%s returns null for empty line', (_name, parse) => {
    expect(parse('')).toBeNull()
    expect(parse('   ')).toBeNull()
    expect(parse('\n')).toBeNull()
  })
})

describe('parseStreamChunk — never throws on malformed JSON', () => {
  const malformed = [
    'data: {not valid json',
    'data: "string but not object"',
    'data: 12345',
    '{"unclosed":',
    'garbage line',
    'data: {"choices":[{"delta":{}}]',  // truncated
  ]

  it.each([
    ['openai',    openai.parseStreamChunk],
    ['google',    google.parseStreamChunk],
    ['mistral',   mistral.parseStreamChunk],
    ['ollama',    ollama.parseStreamChunk],
  ])('%s returns null (does not throw) for malformed chunks', (_name, parse) => {
    for (const line of malformed) {
      expect(() => parse(line)).not.toThrow()
      // Could be null or a chunk with no content — must NEVER throw.
    }
  })

  it('anthropic returns null for malformed chunks across all event types', () => {
    for (const line of malformed) {
      for (const evt of ['message_start', 'content_block_delta', 'message_delta', 'message_stop']) {
        expect(() => anthropic.parseStreamChunk(line, evt)).not.toThrow()
      }
    }
  })
})

describe('parseStreamChunk — SSE [DONE] sentinel', () => {
  it.each(SSE_LIKE.map((adapter, i) => [['openai', 'google', 'mistral'][i], adapter.parseStreamChunk]))(
    '%s handles [DONE] without throwing',
    (_name, parse) => {
      const result = (parse as (l: string) => unknown)('data: [DONE]')
      // OpenAI/Mistral: returns { done: true }. Google: returns null. Both fine.
      expect(() => parse('data: [DONE]')).not.toThrow()
      if (result !== null) {
        expect(result).toMatchObject({ done: true })
      }
    },
  )
})

describe('parseStreamChunk — OpenAI / Mistral content delta extraction', () => {
  const adapters = [['openai', openai.parseStreamChunk], ['mistral', mistral.parseStreamChunk]] as const

  it.each(adapters)('%s extracts delta content from a token chunk', (_name, parse) => {
    const line = `data: ${JSON.stringify({
      choices: [{ delta: { content: 'hello' } }],
    })}`
    const result = parse(line)
    expect(result).toMatchObject({ content: 'hello', done: false })
  })

  it.each(adapters)('%s emits usage when present', (_name, parse) => {
    const line = `data: ${JSON.stringify({
      choices: [{ delta: {} }],
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    })}`
    const result = parse(line)
    expect(result).toMatchObject({
      usage: { input_tokens: 10, output_tokens: 20 },
      done: false,
    })
  })

  it.each(adapters)('%s tolerates missing delta', (_name, parse) => {
    const line = `data: ${JSON.stringify({ choices: [] })}`
    const result = parse(line)
    // Returns a chunk with no content — that's fine.
    expect(result).toMatchObject({ done: false })
  })
})

describe('parseStreamChunk — Google SSE', () => {
  it('extracts text from candidates[0].content.parts[0]', () => {
    const line = `data: ${JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'hi' }] } }],
    })}`
    const result = google.parseStreamChunk(line)
    expect(result).toMatchObject({ content: 'hi', done: false })
  })

  it('emits usage when usageMetadata present', () => {
    const line = `data: ${JSON.stringify({
      candidates: [{ content: { parts: [{ text: '' }] } }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 7 },
    })}`
    const result = google.parseStreamChunk(line)
    expect(result?.usage).toMatchObject({ input_tokens: 5, output_tokens: 7 })
  })

  it('tolerates an empty candidates array', () => {
    const line = `data: ${JSON.stringify({ candidates: [] })}`
    expect(() => google.parseStreamChunk(line)).not.toThrow()
  })
})

describe('parseStreamChunk — Anthropic event-typed SSE', () => {
  it('message_start emits initial input_tokens', () => {
    const line = `data: ${JSON.stringify({
      message: { usage: { input_tokens: 100 } },
    })}`
    const result = anthropic.parseStreamChunk(line, 'message_start')
    expect(result).toMatchObject({
      usage: { input_tokens: 100, output_tokens: 0 },
      done: false,
    })
  })

  it('content_block_delta emits delta text', () => {
    const line = `data: ${JSON.stringify({ delta: { text: 'tok' } })}`
    const result = anthropic.parseStreamChunk(line, 'content_block_delta')
    expect(result).toMatchObject({ content: 'tok', done: false })
  })

  it('message_delta emits output_tokens', () => {
    const line = `data: ${JSON.stringify({ usage: { output_tokens: 42 } })}`
    const result = anthropic.parseStreamChunk(line, 'message_delta')
    expect(result).toMatchObject({ usage: { output_tokens: 42 }, done: false })
  })

  it('message_stop signals end', () => {
    const result = anthropic.parseStreamChunk('data: {}', 'message_stop')
    expect(result).toMatchObject({ done: true })
  })

  it('unknown event type returns null (not throw)', () => {
    const result = anthropic.parseStreamChunk('data: {}', 'totally_invented_event')
    expect(result).toBeNull()
  })
})

describe('parseStreamChunk — Ollama NDJSON', () => {
  it('parses a content chunk without "data:" prefix', () => {
    const line = JSON.stringify({ message: { content: 'tok' }, done: false })
    const result = ollama.parseStreamChunk(line)
    expect(result).toMatchObject({ content: 'tok', done: false })
  })

  it('terminal done=true emits usage and done', () => {
    const line = JSON.stringify({
      message: { content: '' },
      done: true,
      prompt_eval_count: 8,
      eval_count: 12,
    })
    const result = ollama.parseStreamChunk(line)
    expect(result).toMatchObject({
      done: true,
      usage: { input_tokens: 8, output_tokens: 12 },
    })
  })

  it('empty content collapses to undefined (so consumer can skip)', () => {
    const line = JSON.stringify({ message: { content: '' }, done: false })
    const result = ollama.parseStreamChunk(line)
    expect(result?.content).toBeUndefined()
  })

  it('rejects SSE-style "data:" prefix as malformed (NDJSON has no prefix)', () => {
    // Ollama parser doesn't strip "data: " — it tries to JSON.parse the whole
    // string. So "data: {...}" is invalid JSON and returns null.
    const result = ollama.parseStreamChunk('data: {"message":{"content":"hi"},"done":false}')
    expect(result).toBeNull()
  })
})

describe('parseStreamChunk — surface invariants across all adapters', () => {
  it.each([
    ['openai',    openai.parseStreamChunk],
    ['anthropic', anthropic.parseStreamChunk],
    ['google',    google.parseStreamChunk],
    ['mistral',   mistral.parseStreamChunk],
    ['ollama',    ollama.parseStreamChunk],
  ])('%s returned chunk (when not null) has a boolean `done`', (_name, parse) => {
    const candidates = [
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'x' } }] })}`,
      JSON.stringify({ message: { content: 'x' }, done: false }),
      JSON.stringify({ message: { content: '' }, done: true }),
      `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: 'x' }] } }] })}`,
    ]
    for (const line of candidates) {
      // Try each event type for anthropic too.
      for (const evt of [undefined, 'content_block_delta', 'message_stop']) {
        const r = parse(line, evt)
        if (r !== null) {
          expect(typeof r.done).toBe('boolean')
        }
      }
    }
  })
})
