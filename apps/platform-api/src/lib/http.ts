import type { IncomingMessage, ServerResponse } from 'node:http'
import { errorResponse, successResponse, type ApiError } from '@lenserfight/api/contracts'

export async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const text = Buffer.concat(chunks).toString('utf-8').trim()
  return text ? JSON.parse(text) : {}
}

export function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

export function sendSuccess<T>(
  res: ServerResponse,
  statusCode: number,
  data: T,
  requestId: string,
  startedAt: number,
): void {
  sendJson(
    res,
    statusCode,
    successResponse(data, {
      requestId,
      durationMs: Date.now() - startedAt,
    }),
  )
}

export function sendApiError(
  res: ServerResponse,
  statusCode: number,
  error: ApiError,
  requestId: string,
  startedAt: number,
): void {
  sendJson(
    res,
    statusCode,
    errorResponse(error, {
      requestId,
      durationMs: Date.now() - startedAt,
    }),
  )
}

export function getBearerToken(req: IncomingMessage): string | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim()
}
