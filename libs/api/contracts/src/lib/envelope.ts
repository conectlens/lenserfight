export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ApiMeta {
  requestId?: string
  durationMs?: number
  limit?: number
  offset?: number
  total?: number
  hasNextPage?: boolean
  nextCursor?: string
}

export interface ApiResponseEnvelope<T> {
  data?: T
  meta?: ApiMeta
  error?: ApiError
}

/**
 * Enforce that any paginated port method accepts offset + limit.
 * Any repository list method missing these parameters is a defect per repo-performance-guard rule #2.
 */
export type PaginatedPort<T> = (
  offset: number,
  limit: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => Promise<ApiResponseEnvelope<T[]>>

export const successResponse = <T>(data: T, meta?: ApiMeta): ApiResponseEnvelope<T> => ({
  data,
  meta,
})

export const errorResponse = (error: ApiError, meta?: ApiMeta): ApiResponseEnvelope<never> => ({
  error,
  meta,
})

export const paginatedResponse = <T>(
  data: T,
  pagination: { limit: number; offset: number; total?: number; hasNextPage: boolean },
  meta?: Omit<ApiMeta, 'limit' | 'offset' | 'total' | 'hasNextPage'>,
): ApiResponseEnvelope<T> => ({
  data,
  meta: { ...meta, ...pagination },
})
