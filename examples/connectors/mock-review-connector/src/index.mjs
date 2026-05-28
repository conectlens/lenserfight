const VALID_TOKEN = 'dev-service-token'
const scopes = ['lenses:read', 'workflows:write', 'connectors:read']

export function createMockReviewConnector(options = {}) {
  const received = []
  const failNext = Boolean(options.failNext)

  return {
    id() {
      return 'mock-review'
    },
    metadata() {
      return {
        slug: 'mock-review',
        name: 'Mock Review Connector',
        kind: 'api',
        scopes,
        isActive: true,
        description: 'Local mock connector for tutorials and tests.',
      }
    },
    async verify(token) {
      if (!token) return { ok: false, scopes: [], reason: 'token_missing' }
      if (token !== VALID_TOKEN) return { ok: false, scopes: [], reason: 'token_revoked' }
      return { ok: true, scopes: [...scopes] }
    },
    async dispatch(event) {
      const startedAt = Date.now()
      if (failNext) {
        return {
          ok: false,
          latencyMs: Date.now() - startedAt,
          status: 503,
          error: 'mock_unavailable',
        }
      }
      received.push({
        type: event.type,
        payload: event.payload,
        receivedAt: new Date().toISOString(),
      })
      return { ok: true, latencyMs: Date.now() - startedAt, status: 202 }
    },
    received() {
      return [...received]
    },
  }
}

export { VALID_TOKEN }
