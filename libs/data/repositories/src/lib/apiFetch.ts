import { normalizeJsonStringToSnakeCase, toCamelCaseKeys } from '@lenserfight/utils/text'

export interface ApiFetchConfig {
  /**
   * Transform outgoing JSON request body keys from camelCase to snake_case.
   * Default: true
   */
  transformRequest?: boolean
  /**
   * Transform incoming JSON response body keys from snake_case to camelCase.
   * Default: false
   */
  transformResponse?: boolean
}

export function normalizeJsonRequestBody(body: BodyInit | null | undefined): BodyInit | null | undefined {
  if (typeof body !== 'string') return body
  return normalizeJsonStringToSnakeCase(body)
}

/**
 * Creates a `fetch`-compatible function that automatically normalizes JSON
 * request/response keys according to the supplied config.
 *
 * - Outgoing: camelCase → snake_case  (transformRequest, default on)
 * - Incoming: snake_case → camelCase  (transformResponse, default off)
 *
 * Non-JSON bodies (FormData, plain strings, binary) pass through untouched.
 *
 * @example
 * const apiFetch = createApiFetch()
 * const res = await apiFetch('/v1/executions', { method: 'POST', body: JSON.stringify(dto) })
 */
export function createApiFetch(config: ApiFetchConfig = {}) {
  const { transformRequest = true, transformResponse = false } = config

  return async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
    let finalInit = init

    if (transformRequest) {
      const normalizedBody = normalizeJsonRequestBody(init.body)
      if (normalizedBody !== init.body) {
        finalInit = { ...init, body: normalizedBody }
      }
    }

    const response = await fetch(url, finalInit)

    if (!response.ok) {
      let errorBody: unknown
      try {
        errorBody = await response.clone().json()
      } catch {
        errorBody = { error: response.statusText || `HTTP ${response.status}` }
      }
      throw errorBody
    }

    if (!transformResponse) return response

    // Wrap .json() to transform response keys on demand (lazy — no extra round-trip)
    const originalJson = response.json.bind(response)
    return Object.assign(Object.create(response), {
      json: async () => toCamelCaseKeys(await originalJson()),
    })
  }
}

/**
 * Default API fetch instance.
 * Transforms outgoing JSON request body keys from camelCase to snake_case.
 */
export const apiFetch = createApiFetch()
