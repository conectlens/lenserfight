// resolveProviderKey is pure string logic, but importing run-workflow-graph
// pulls in @lenserfight/infra/execution, whose real registry transitively loads
// providers that use import.meta.env (unparseable by this CommonJS jest). Every
// sibling worker spec mocks that module for the same reason. Here the mock's
// getExecutionProvider FAITHFULLY reproduces the real registry's fail-closed
// contract (execution.registry.ts throws for any key not registered) against the
// exact registered key set verified from source, so the fail-closed assertions
// exercise real semantics without loading import.meta-tainted providers.
const REGISTERED_PROVIDER_KEYS = [
  'fal-ai',
  'echo',
  'google',
  'gemini',
  'openai',
  'anthropic',
  'mistral',
  'ollama',
  'research',
  'pdf-export',
]

jest.mock('@lenserfight/infra/execution', () => ({
  WorkflowExecutionService: jest.fn(),
  SupabaseDelegationHandler: jest.fn(),
  createOAuthConnectionResolver: jest.fn(() => ({ resolve: jest.fn() })),
  createServerConnectorResolver: jest.fn(() => ({ resolve: jest.fn() })),
  createCompositeConnectorResolver: jest.fn(() => ({ resolve: jest.fn() })),
  nullOAuthConnectionResolver: { resolve: jest.fn() },
  // Mirrors getExecutionProvider in libs/infra/execution/src/lib/execution.registry.ts:
  // throws for any id not in the registered PROVIDERS map.
  getExecutionProvider: jest.fn((id: string) => {
    if (!REGISTERED_PROVIDER_KEYS.includes(id)) {
      throw new Error(`No execution provider registered for id: "${id}".`)
    }
    return {}
  }),
}))
jest.mock('@lenserfight/utils/logger', () => ({
  nodeLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { getExecutionProvider } from '@lenserfight/infra/execution'
import { resolveProviderKey } from './run-workflow-graph'

describe('resolveProviderKey', () => {
  describe('explicit provider prefix (canonical `provider:model` ids)', () => {
    it('routes openai:… to openai (the bug — was silently defaulting to anthropic)', () => {
      expect(resolveProviderKey('openai:gpt-4.1-mini')).toBe('openai')
    })

    it('routes anthropic:… to anthropic', () => {
      expect(resolveProviderKey('anthropic:claude-3-5-sonnet')).toBe('anthropic')
    })

    it('routes google:… to google (verified registry key)', () => {
      expect(resolveProviderKey('google:gemini-2.0-flash')).toBe('google')
    })

    it('maps the fal alias prefix to the fal-ai registry key', () => {
      expect(resolveProviderKey('fal:stable-diffusion-xl')).toBe('fal-ai')
    })

    it('fails closed on an unknown explicit prefix (no anthropic default)', () => {
      expect(resolveProviderKey('nope:x')).toBe('nope')
      expect(() => getExecutionProvider('nope')).toThrow()
    })

    it('fails closed on a typo’d explicit prefix', () => {
      expect(resolveProviderKey('opeanai:gpt-4o')).toBe('opeanai')
      expect(() => getExecutionProvider('opeanai')).toThrow()
    })
  })

  describe('bare model-name heuristics (no colon — unchanged behaviour)', () => {
    it('keeps fal-ai/ path routing to fal-ai', () => {
      expect(resolveProviderKey('fal-ai/flux')).toBe('fal-ai')
    })

    it('routes gpt* to openai', () => {
      expect(resolveProviderKey('gpt-4o')).toBe('openai')
    })

    it('routes claude* to anthropic', () => {
      expect(resolveProviderKey('claude-3-5-sonnet')).toBe('anthropic')
    })

    it('routes mistral* to mistral', () => {
      expect(resolveProviderKey('mistral-large')).toBe('mistral')
    })

    it('routes gemini* to google', () => {
      expect(resolveProviderKey('gemini-2.0-flash')).toBe('google')
    })

    it('defaults an unrecognised bare id to anthropic', () => {
      expect(resolveProviderKey('some-unknown-model')).toBe('anthropic')
    })
  })

  it('every explicit-prefix result maps to a registered, resolvable provider', () => {
    for (const id of [
      'openai:gpt-4.1-mini',
      'anthropic:claude-3-5-sonnet',
      'google:gemini-2.0-flash',
      'gemini:gemini-2.0-flash',
      'mistral:mistral-large',
      'ollama:llama3',
      'fal:flux',
    ]) {
      expect(() => getExecutionProvider(resolveProviderKey(id))).not.toThrow()
    }
  })
})
