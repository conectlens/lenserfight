import { classifyError, serializeTaxonomyEntry } from './error-taxonomy'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function httpError(status: number, message: string, code?: string): Error {
  return Object.assign(new Error(message), { status, code })
}

// ─── Authorization ────────────────────────────────────────────────────────────

describe('classifyError — unauthorized', () => {
  it('classifies HTTP 401 as unauthorized', () => {
    expect(classifyError(httpError(401, 'Unauthorized')).kind).toBe('unauthorized')
  })

  it('classifies PGRST301 code as unauthorized', () => {
    expect(classifyError(httpError(401, 'JWT expired', 'PGRST301')).kind).toBe('unauthorized')
  })

  it('classifies PGRST302 code as unauthorized', () => {
    expect(classifyError(httpError(401, 'JWT invalid', 'PGRST302')).kind).toBe('unauthorized')
  })

  it('classifies jwt in message as unauthorized', () => {
    expect(classifyError(new Error('invalid jwt signature')).kind).toBe('unauthorized')
  })

  it('classifies "not authenticated" message as unauthorized', () => {
    expect(classifyError(new Error('User is not authenticated')).kind).toBe('unauthorized')
  })
})

// ─── Forbidden ────────────────────────────────────────────────────────────────

describe('classifyError — forbidden', () => {
  it('classifies HTTP 403 as forbidden', () => {
    expect(classifyError(httpError(403, 'Forbidden')).kind).toBe('forbidden')
  })

  it('classifies "permission denied" message as forbidden', () => {
    expect(classifyError(new Error('permission denied for table')).kind).toBe('forbidden')
  })
})

// ─── Not found ────────────────────────────────────────────────────────────────

describe('classifyError — not_found', () => {
  it('classifies HTTP 404 as not_found', () => {
    expect(classifyError(httpError(404, 'Not Found')).kind).toBe('not_found')
  })

  it('classifies "not found" message as not_found', () => {
    expect(classifyError(new Error('battle not found')).kind).toBe('not_found')
  })

  it('classifies "does not exist" as not_found', () => {
    expect(classifyError(new Error('resource does not exist')).kind).toBe('not_found')
  })
})

// ─── Rate limit ───────────────────────────────────────────────────────────────

describe('classifyError — rate_limited', () => {
  it('classifies HTTP 429 as rate_limited', () => {
    expect(classifyError(httpError(429, 'Too Many Requests')).kind).toBe('rate_limited')
  })

  it('classifies BATTLE_RATE_LIMIT code as rate_limited', () => {
    expect(classifyError(httpError(429, 'battle_rate_limit_exceeded', 'BATTLE_RATE_LIMIT')).kind).toBe('rate_limited')
  })

  it('classifies battle_rate_limit in message as rate_limited', () => {
    expect(classifyError(new Error('battle_rate_limit_exceeded')).kind).toBe('rate_limited')
  })
})

// ─── Network ──────────────────────────────────────────────────────────────────

describe('classifyError — network', () => {
  it('classifies TypeError with fetch as network', () => {
    expect(classifyError(new TypeError('fetch failed'))).toMatchObject({ kind: 'network' })
  })

  it('classifies ECONNREFUSED (non-gateway port) as network', () => {
    expect(classifyError(new Error('connect ECONNREFUSED 127.0.0.1:8080')).kind).toBe('network')
  })

  it('classifies ENOTFOUND as network', () => {
    expect(classifyError(new Error('getaddrinfo ENOTFOUND api.lenserfight.com')).kind).toBe('network')
  })

  it('classifies ETIMEDOUT as network', () => {
    expect(classifyError(new Error('connection ETIMEDOUT')).kind).toBe('network')
  })
})

// ─── Gateway ─────────────────────────────────────────────────────────────────

describe('classifyError — gateway', () => {
  it('classifies GATEWAY_UNAVAILABLE code as gateway', () => {
    const err = Object.assign(new Error('gateway down'), { code: 'GATEWAY_UNAVAILABLE' })
    expect(classifyError(err).kind).toBe('gateway')
  })

  it('classifies "trust gateway" in message as gateway', () => {
    expect(classifyError(new Error('trust gateway not reachable')).kind).toBe('gateway')
  })

  it('classifies "gateway" in message as gateway', () => {
    expect(classifyError(new Error('gateway error')).kind).toBe('gateway')
  })
})

// ─── Local model ──────────────────────────────────────────────────────────────

describe('classifyError — local_model', () => {
  it('classifies OLLAMA_ERROR code as local_model', () => {
    const err = Object.assign(new Error('ollama failed'), { code: 'OLLAMA_ERROR' })
    expect(classifyError(err).kind).toBe('local_model')
  })

  it('classifies "ollama" in message as local_model', () => {
    expect(classifyError(new Error('ollama server not running')).kind).toBe('local_model')
  })

  it('classifies ECONNREFUSED on port 11434 as local_model', () => {
    expect(classifyError(new Error('connect ECONNREFUSED 127.0.0.1:11434')).kind).toBe('local_model')
  })
})

// ─── Provider ────────────────────────────────────────────────────────────────

describe('classifyError — provider', () => {
  it('classifies PROVIDER_ERROR code as provider', () => {
    const err = Object.assign(new Error('api error'), { code: 'PROVIDER_ERROR' })
    expect(classifyError(err).kind).toBe('provider')
  })

  it('classifies "openai" in message as provider', () => {
    expect(classifyError(new Error('OpenAI returned 500')).kind).toBe('provider')
  })

  it('classifies "invalid_api_key" in message as provider', () => {
    expect(classifyError(new Error('invalid_api_key provided')).kind).toBe('provider')
  })

  it('classifies "quota exceeded" as provider', () => {
    expect(classifyError(new Error('quota exceeded for this model')).kind).toBe('provider')
  })
})

// ─── Multimodal ───────────────────────────────────────────────────────────────

describe('classifyError — multimodal', () => {
  it('classifies MODALITY_MISMATCH code as multimodal', () => {
    const err = Object.assign(new Error('mismatch'), { code: 'MODALITY_MISMATCH' })
    expect(classifyError(err).kind).toBe('multimodal')
  })

  it('classifies "modality" in message as multimodal', () => {
    expect(classifyError(new Error('unsupported modality: image')).kind).toBe('multimodal')
  })

  it('classifies "text-to-image" in message as multimodal', () => {
    expect(classifyError(new Error('provider does not support text-to-image')).kind).toBe('multimodal')
  })
})

// ─── Workflow ────────────────────────────────────────────────────────────────

describe('classifyError — workflow', () => {
  it('classifies WORKFLOW_ERROR code as workflow', () => {
    const err = Object.assign(new Error('execution error'), { code: 'WORKFLOW_ERROR' })
    expect(classifyError(err).kind).toBe('workflow')
  })

  it('classifies "workflow" in message as workflow', () => {
    expect(classifyError(new Error('workflow node failed')).kind).toBe('workflow')
  })
})

// ─── Battle ───────────────────────────────────────────────────────────────────

describe('classifyError — battle', () => {
  it('classifies BATTLE_ERROR code as battle', () => {
    const err = Object.assign(new Error('error'), { code: 'BATTLE_ERROR' })
    expect(classifyError(err).kind).toBe('battle')
  })

  it('classifies "contender" in message as battle', () => {
    expect(classifyError(new Error('contender submission failed')).kind).toBe('battle')
  })
})

// ─── Schema ───────────────────────────────────────────────────────────────────

describe('classifyError — schema', () => {
  it('classifies SCHEMA_INVALID code as schema', () => {
    const err = Object.assign(new Error('invalid'), { code: 'SCHEMA_INVALID' })
    expect(classifyError(err).kind).toBe('schema')
  })

  it('classifies "schema" in message as schema', () => {
    expect(classifyError(new Error('schema validation failed')).kind).toBe('schema')
  })

  it('classifies "invalid json" as schema', () => {
    expect(classifyError(new Error('invalid json in request body')).kind).toBe('schema')
  })
})

// ─── Config ───────────────────────────────────────────────────────────────────

describe('classifyError — config', () => {
  it('classifies "supabase anon key not found" as config', () => {
    expect(classifyError(new Error('Supabase anon key not found')).kind).toBe('config')
  })

  it('classifies "service role key not found" as config', () => {
    expect(classifyError(new Error('Service role key not found.')).kind).toBe('config')
  })

  it('classifies CONFIG_ERROR code as config', () => {
    const err = Object.assign(new Error('bad config'), { code: 'CONFIG_ERROR' })
    expect(classifyError(err).kind).toBe('config')
  })
})

// ─── Unknown ─────────────────────────────────────────────────────────────────

describe('classifyError — unknown', () => {
  it('classifies plain Error as unknown', () => {
    expect(classifyError(new Error('something weird')).kind).toBe('unknown')
  })

  it('classifies null as unknown', () => {
    expect(classifyError(null).kind).toBe('unknown')
  })

  it('classifies undefined as unknown', () => {
    expect(classifyError(undefined).kind).toBe('unknown')
  })

  it('classifies number as unknown', () => {
    expect(classifyError(42).kind).toBe('unknown')
  })

  it('classifies generic "error" message as unknown with taxonomy detail', () => {
    const entry = classifyError(new Error('Error'))
    expect(entry.kind).toBe('unknown')
    expect(entry.detail).toBe('An unexpected error occurred.')
  })
})

// ─── TaxonomyEntry shape ─────────────────────────────────────────────────────

describe('classifyError — TaxonomyEntry shape', () => {
  it('always includes all required fields', () => {
    const entry = classifyError(new Error('network timeout'))
    expect(entry).toHaveProperty('kind')
    expect(entry).toHaveProperty('headline')
    expect(entry).toHaveProperty('detail')
    expect(entry).toHaveProperty('recoverable')
    expect(entry).toHaveProperty('component')
    expect(entry).toHaveProperty('docsKey')
    expect(entry).toHaveProperty('inspectArea')
  })

  it('preserves specific error message as detail when it is informative', () => {
    const entry = classifyError(new Error('Your OAuth token is missing the required scope'))
    // Informative message should be preserved over the generic unauthorized detail
    expect(entry.detail).toContain('scope')
  })

  it('falls back to taxonomy detail for generic messages', () => {
    const entry = classifyError(Object.assign(new Error('Error'), { status: 401 }))
    expect(entry.detail).toBe('Authentication required. Your session may have expired.')
  })
})

// ─── serializeTaxonomyEntry ───────────────────────────────────────────────────

describe('serializeTaxonomyEntry', () => {
  it('returns a plain object suitable for JSON.stringify', () => {
    const error = new Error('JWT expired')
    const entry = classifyError(error)
    const serialized = serializeTaxonomyEntry(entry, error)

    expect(typeof serialized).toBe('object')
    expect(serialized['kind']).toBe('unauthorized')
    expect(serialized['recoverable']).toBe(true)
    expect((serialized['raw'] as Record<string, unknown>)['message']).toBe('JWT expired')
  })

  it('handles non-Error thrown values', () => {
    const entry = classifyError('string error')
    const serialized = serializeTaxonomyEntry(entry, 'string error')
    expect(serialized['raw']).toBe('string error')
  })
})
