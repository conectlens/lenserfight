import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { nodeLogger } from '@lenserfight/utils/logger'
import { sendApiError } from '../lib/http'
import { handleLensesExecuteRoute } from './routes/lenses-execute.route'
import { handleRunsGetRoute } from './routes/runs-get.route'
import { handleWorkflowRunRoute } from './routes/workflows-run.route'

function parsePath(url: string): string[] {
  return new URL(url, 'http://localhost').pathname.split('/').filter(Boolean)
}

const port = parseInt(process.env['PORT'] ?? '8786', 10)

const server = createServer(async (req, res) => {
  const requestId = randomUUID()
  const startedAt = Date.now()

  try {
    if (!req.url || !req.method) {
      sendApiError(res, 400, { code: 'bad_request', message: 'Request URL or method missing' }, requestId, startedAt)
      return
    }

    const parts = parsePath(req.url)
    if (req.method === 'POST' && parts[0] === 'v1' && parts[1] === 'lenses' && parts[3] === 'execute') {
      await handleLensesExecuteRoute(req, res, parts[2], requestId, startedAt)
      return
    }

    if (req.method === 'GET' && parts[0] === 'v1' && parts[1] === 'runs' && parts[2]) {
      await handleRunsGetRoute(req, res, parts[2], requestId, startedAt)
      return
    }

    if (req.method === 'POST' && parts[0] === 'v1' && parts[1] === 'workflows' && parts[3] === 'run') {
      await handleWorkflowRunRoute(req, res, parts[2], requestId, startedAt)
      return
    }

    sendApiError(res, 404, { code: 'not_found', message: 'Route not found' }, requestId, startedAt)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    nodeLogger.error('platform-api request failed', { requestId, message, path: req.url, method: req.method })
    sendApiError(
      res,
      message.toLowerCase().includes('auth') || message.toLowerCase().includes('token') ? 401 : 400,
      { code: 'request_failed', message },
      requestId,
      startedAt,
    )
  }
})

server.listen(port, () => {
  nodeLogger.info('platform-api listening', { port })
})
