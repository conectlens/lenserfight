/**
 * Cross-path integration.
 *
 * The same (model, messages, options) tuple MUST produce a byte-identical
 * wire request whether dispatched via:
 *   - `callProvider` directly (used by lens.text_stream and battle workers)
 *   - the per-adapter `transformRequest` (used by the workflow node-runtime)
 *
 * This is the invariant that lets a battle, a workflow DAG node, and a direct
 * lens execution share their results without contending for prompt/output
 * normalization. Drift here causes "works in lens, broken in battle" bugs.
 */

import { callProvider } from '../../index'
import * as openai from '../openai'
import * as anthropic from '../anthropic'
import * as google from '../google'
import * as mistral from '../mistral'
import { ProviderRequestRecorder } from '../testing/provider-request-recorder'

describe('cross-path integration — same input → byte-identical request body', () => {
  const recorder = new ProviderRequestRecorder()
  beforeEach(() => recorder.install())
  afterEach(() => { recorder.uninstall(); recorder.reset() })

  it('openai: callProvider body matches transformRequest body', async () => {
    const messages = [
      { role: 'system' as const, content: 'be helpful' },
      { role: 'user' as const, content: 'hi' },
    ]
    const options = { maxTokens: 100, temperature: 0.5 }
    const expected = JSON.parse(openai.transformRequest('gpt-4o', messages, options).body)

    recorder.queueResponse({
      body: { choices: [{ message: { content: 'hi' } }], usage: { prompt_tokens: 1, completion_tokens: 1 } },
    })
    await callProvider('openai', 'sk-test', 'gpt-4o', messages, options)
    expect(recorder.lastRequest?.bodyJson).toEqual(expected)
  })

  it('anthropic: callProvider body matches transformRequest body', async () => {
    const messages = [
      { role: 'system' as const, content: 'be helpful' },
      { role: 'user' as const, content: 'hi' },
    ]
    const options = { maxTokens: 256 }
    const expected = JSON.parse(anthropic.transformRequest('claude-haiku-4-5', messages, options).body)

    recorder.queueResponse({
      body: { content: [{ type: 'text', text: 'hi' }], usage: { input_tokens: 1, output_tokens: 1 } },
    })
    await callProvider('anthropic', 'sk-ant-test', 'claude-haiku-4-5', messages, options)
    expect(recorder.lastRequest?.bodyJson).toEqual(expected)
  })

  it('google: callProvider body matches transformRequest body', async () => {
    const messages = [
      { role: 'system' as const, content: 'be helpful' },
      { role: 'user' as const, content: 'hi' },
    ]
    const expected = JSON.parse(google.transformRequest('gemini-2.5-flash', messages, {}).body)

    recorder.queueResponse({
      body: {
        candidates: [{ content: { parts: [{ text: 'hi' }] } }],
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
      },
    })
    await callProvider('google', 'AIza', 'gemini-2.5-flash', messages, {})
    expect(recorder.lastRequest?.bodyJson).toEqual(expected)
  })

  it('mistral: callProvider body matches transformRequest body', async () => {
    const messages = [{ role: 'user' as const, content: 'hi' }]
    const options = { temperature: 0.3 }
    const expected = JSON.parse(mistral.transformRequest('mistral-large-3', messages, options).body)

    recorder.queueResponse({
      body: { choices: [{ message: { content: 'hi' } }], usage: { prompt_tokens: 1, completion_tokens: 1 } },
    })
    await callProvider('mistral', 'mst-test', 'mistral-large-3', messages, options)
    expect(recorder.lastRequest?.bodyJson).toEqual(expected)
  })
})

describe('cross-path integration — same input → identical auth headers', () => {
  const recorder = new ProviderRequestRecorder()
  beforeEach(() => recorder.install())
  afterEach(() => { recorder.uninstall(); recorder.reset() })

  it.each([
    ['openai',    'gpt-4o-mini',        'sk-test',     'authorization', 'Bearer sk-test'],
    ['anthropic', 'claude-haiku-4-5',   'sk-ant-test', 'x-api-key',     'sk-ant-test'],
    ['mistral',   'mistral-large-3',    'mst-test',    'authorization', 'Bearer mst-test'],
  ] as const)('%s puts the key in the %s header', async (provider, model, key, headerName, expected) => {
    recorder.queueResponse({
      body: provider === 'anthropic'
        ? { content: [{ type: 'text', text: 'x' }], usage: { input_tokens: 0, output_tokens: 0 } }
        : { choices: [{ message: { content: 'x' } }], usage: { prompt_tokens: 0, completion_tokens: 0 } },
    })
    await callProvider(provider, key, model, [{ role: 'user', content: 'hi' }])
    expect(recorder.lastRequest?.headers[headerName]).toBe(expected)
  })
})

describe('cross-path integration — wire model translation is consistent', () => {
  const recorder = new ProviderRequestRecorder()
  beforeEach(() => recorder.install())
  afterEach(() => { recorder.uninstall(); recorder.reset() })

  it('callGenerativeMedia and the registry agree on dall-e-4 → gpt-image-1', async () => {
    const { lookupModel } = await import('../model-registry')
    const desc = lookupModel('dall-e-4')
    expect(desc?.wireModel).toBe('gpt-image-1')

    const { callGenerativeMedia } = await import('../../index')
    recorder.queueResponse({ body: { data: [{ url: 'https://x.png' }] } })
    await callGenerativeMedia('openai', 'image', 'sk-test', 'dall-e-4', 'a cat')
    expect(recorder.lastRequest?.bodyJson).toMatchObject({ model: 'gpt-image-1' })
  })

  it('callGenerativeMedia uses the wire model for sora-2.0 → sora-2', async () => {
    const { lookupModel } = await import('../model-registry')
    const desc = lookupModel('sora-2.0')
    expect(desc?.wireModel).toBe('sora-2')

    const { callGenerativeMedia } = await import('../../index')
    recorder.queueResponse({ body: { id: 'video_xyz', status: 'in_progress' } })
    await callGenerativeMedia('openai', 'video', 'sk-test', 'sora-2.0', 'a cat')
    expect(recorder.lastRequest?.bodyJson?.model).toBe('sora-2')
  })
})
