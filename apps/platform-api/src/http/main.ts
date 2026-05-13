import { createServer, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { nodeLogger } from '@lenserfight/utils/logger'
import { partnerRegistry, ChainbitPartnerProvider } from '@lenserfight/infra/partner-provisioning'
import { PLATFORM_API_PORT, PLATFORM_API_CORS_ORIGIN } from '@lenserfight/utils/env'
import { sendApiError } from '../lib/http'
import { handleLensesExecuteRoute } from './routes/lenses-execute.route'
import { handleRunsGetRoute } from './routes/runs-get.route'
import { handleRunsSseRoute } from './routes/runs-sse.route'
import { handleWorkflowRunRoute } from './routes/workflows-run.route'
import { handlePartnersProvisionRoute } from './routes/partners-provision.route'
import { handlePartnersBalanceRoute } from './routes/partners-balance.route'
import { handlePartnersRefreshTokenRoute } from './routes/partners-refresh-token.route'
import { handlePartnersSendClaimRoute } from './routes/partners-send-claim.route'
import { handlePartnersModelsRoute } from './routes/partners-models.route'
import { handlePartnersRevokeRoute } from './routes/partners-revoke.route'
import { handleChainabitLoginRoute } from './routes/partners-oauth-start.route'
import { handlePartnersOAuthCallbackRoute } from './routes/partners-oauth-callback.route'
import { handleHealthRoute } from './routes/health.route'
import { handleBattleShareCardRoute } from './routes/battles-share-card.route'
import { handleMediaProxyRoute } from './routes/media-proxy.route'
import { handleGetVoteAnomalies, handleResolveVoteAnomaly } from './routes/admin-moderation.route'
import { handleWorkflowWebhookTrigger } from './routes/workflow-webhook.route'

// Register partner providers — add new partners here, nothing else changes
partnerRegistry.register(new ChainbitPartnerProvider())

function parsePath(url: string): string[] {
  return new URL(url, 'http://localhost').pathname.split('/').filter(Boolean)
}

const port = PLATFORM_API_PORT()

function applyCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', PLATFORM_API_CORS_ORIGIN())
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

const server = createServer(async (req, res) => {
  const requestId = randomUUID()
  const startedAt = Date.now()

  applyCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  try {
    if (!req.url || !req.method) {
      sendApiError(res, 400, { code: 'bad_request', message: 'Request URL or method missing' }, requestId, startedAt)
      return
    }

    const parts = parsePath(req.url)

    // Health probe — unauthenticated, returns 200 ok / 503 degraded.
    if (req.method === 'GET' && parts[0] === 'health' && parts.length === 1) {
      await handleHealthRoute(req, res)
      return
    }

    if (req.method === 'POST' && parts[0] === 'v1' && parts[1] === 'lenses' && parts[3] === 'execute') {
      await handleLensesExecuteRoute(req, res, parts[2], requestId, startedAt)
      return
    }

    if (req.method === 'GET' && parts[0] === 'v1' && parts[1] === 'runs' && parts[2] && parts[3] === 'events') {
      await handleRunsSseRoute(req, res, parts[2])
      return
    }

    // Legacy path used by the web client: /execute/workflows/:runId/events
    if (req.method === 'GET' && parts[0] === 'execute' && parts[1] === 'workflows' && parts[2] && parts[3] === 'events') {
      await handleRunsSseRoute(req, res, parts[2])
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

    // Phase AK — GET /v1/media/:objectId — owner-only signed URL redirect.
    if (req.method === 'GET' && parts[0] === 'v1' && parts[1] === 'media' && parts[2] && parts.length === 3) {
      await handleMediaProxyRoute(req, res, parts[2], requestId, startedAt)
      return
    }

    // Battle share-card OG image — /v1/battles/:slug/share-card.<ext>
    if (
      req.method === 'GET' &&
      parts[0] === 'v1' &&
      parts[1] === 'battles' &&
      parts[2] &&
      typeof parts[3] === 'string' &&
      parts[3].startsWith('share-card.')
    ) {
      await handleBattleShareCardRoute(req, res, parts)
      return
    }

    // Partner provisioning routes — /v1/partners/:name/provision|balance|refresh-token|send-claim
    if (parts[0] === 'v1' && parts[1] === 'partners' && parts[2]) {
      const partnerName = parts[2]
      if (!partnerRegistry.has(partnerName)) {
        sendApiError(res, 404, { code: 'not_found', message: `Unknown partner: ${partnerName}` }, requestId, startedAt)
        return
      }
      if (req.method === 'POST' && parts[3] === 'provision') {
        await handlePartnersProvisionRoute(req, res, partnerName, requestId, startedAt)
        return
      }
      if (req.method === 'GET' && parts[3] === 'balance') {
        await handlePartnersBalanceRoute(req, res, partnerName, requestId, startedAt)
        return
      }
      if (req.method === 'POST' && parts[3] === 'refresh-token') {
        await handlePartnersRefreshTokenRoute(req, res, partnerName, requestId, startedAt)
        return
      }
      if (req.method === 'POST' && parts[3] === 'send-claim') {
        await handlePartnersSendClaimRoute(req, res, partnerName, requestId, startedAt)
        return
      }
      if (req.method === 'GET' && parts[3] === 'models') {
        await handlePartnersModelsRoute(req, res, partnerName, requestId, startedAt)
        return
      }
      if (req.method === 'POST' && parts[3] === 'revoke') {
        await handlePartnersRevokeRoute(req, res, partnerName, requestId, startedAt)
        return
      }
    }

    // GET /v1/partners/:name/oauth/callback — Chainabit redirects here; no JWT (browser redirect)
    if (req.method === 'GET' && parts[0] === 'v1' && parts[1] === 'partners' && parts[3] === 'oauth' && parts[4] === 'callback') {
      await handlePartnersOAuthCallbackRoute(req, res)
      return
    }

    // GET /v1/auth/chainabit/login — unauthenticated entry for social sign-in via Chainabit
    if (req.method === 'GET' && parts[0] === 'v1' && parts[1] === 'auth' && parts[2] === 'chainabit' && parts[3] === 'login') {
      await handleChainabitLoginRoute(req, res)
      return
    }

    // POST /workflows/:id/trigger — HMAC webhook (public, rate-limited)
    if (req.method === 'POST' && parts[0] === 'workflows' && parts[2] === 'trigger') {
      await handleWorkflowWebhookTrigger(req, res, parts[1], requestId, startedAt)
      return
    }

    // GET /admin/vote-anomalies?status=...
    if (req.method === 'GET' && parts[0] === 'admin' && parts[1] === 'vote-anomalies' && parts.length === 2) {
      await handleGetVoteAnomalies(req, res, requestId, startedAt)
      return
    }

    // POST /admin/vote-anomalies/:id/resolve
    if (req.method === 'POST' && parts[0] === 'admin' && parts[1] === 'vote-anomalies' && parts[3] === 'resolve') {
      await handleResolveVoteAnomaly(req, res, parts[2], requestId, startedAt)
      return
    }

    sendApiError(res, 404, { code: 'not_found', message: 'Route not found' }, requestId, startedAt)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    nodeLogger.error('platform-api request failed', { requestId, message, path: req.url, method: req.method })

    if (message === 'battle_rate_limit_exceeded') {
      sendApiError(res, 429, { code: 'BATTLE_RATE_LIMIT', message: 'You can create at most 5 battles per day.' }, requestId, startedAt)
      return
    }

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
