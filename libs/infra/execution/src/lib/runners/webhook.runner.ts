/**
 * WebhookTriggerRunner / WebhookSenderRunner — inbound and outbound webhooks.
 *
 * WebhookTriggerRunner:
 *   Config: secret?: string — HMAC secret for validating inbound POST
 *   Emits an envelope the engine uses to register the webhook endpoint.
 *
 * WebhookSenderRunner:
 *   Config: url, method?, headers?, bodyTemplate?, retries?
 *   Emits a request envelope; the engine makes the outbound HTTP call.
 *
 * Security:
 * - WebhookTrigger: HMAC validation mandatory; rate limit 100/min per secret.
 * - WebhookSender: URL validated; no internal/private IP ranges; 3 retries max.
 * - Body size capped at 1MB.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const MAX_BODY_SIZE = 1_048_576 // 1MB
const MAX_RETRIES = 3
const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^localhost$/i,
  /^::1$/,
  /^\[::1\]$/,
]

function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return PRIVATE_IP_PATTERNS.some((p) => p.test(parsed.hostname))
  } catch {
    return true
  }
}

export class WebhookTriggerRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'webhook_trigger'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const secret = ctx.nodeConfig['secret'] as string | undefined
    const workflowId = ctx.resolvedParams['__workflow_id'] as string | undefined

    if (!secret || typeof secret !== 'string' || secret.length < 16) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'Webhook secret must be at least 16 characters' },
          durationMs: 0,
        },
      }
    }

    return {
      output: {
        mediaType: 'text',
        text: `[Webhook Trigger registered]`,
        data: {
          __webhook_trigger_request: true,
          endpoint: `/api/workflow-webhook/${secret.slice(0, 8)}...`,
          workflowId: workflowId ?? null,
          rateLimitPerMin: 100,
        },
        durationMs: 0,
      },
      variableMutations: { __webhook_active: true },
    }
  }
}

export class WebhookSenderRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'webhook_sender'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const url = ctx.nodeConfig['url'] as string | undefined
    const method = ((ctx.nodeConfig['method'] as string) ?? 'POST').toUpperCase()
    const headers = ctx.nodeConfig['headers'] as Record<string, string> | undefined
    const bodyTemplate = ctx.nodeConfig['bodyTemplate'] as string | undefined
    const retries = Math.max(0, Math.min(Number(ctx.nodeConfig['retries'] ?? MAX_RETRIES), MAX_RETRIES))

    if (!url || typeof url !== 'string') {
      return {
        output: { mediaType: 'text', text: '', data: { error: 'No URL configured' }, durationMs: 0 },
      }
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return {
        output: { mediaType: 'text', text: '', data: { error: 'Invalid URL format', url }, durationMs: 0 },
      }
    }

    // Block private IPs (SSRF protection)
    if (isPrivateUrl(url)) {
      return {
        output: { mediaType: 'text', text: '', data: { error: 'Cannot send to private/internal URLs', url }, durationMs: 0 },
      }
    }

    // Validate method
    const allowedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
    if (!allowedMethods.has(method)) {
      return {
        output: { mediaType: 'text', text: '', data: { error: `Method "${method}" not allowed` }, durationMs: 0 },
      }
    }

    // Resolve body from template or upstream
    let body: string | undefined = bodyTemplate
    if (!body) {
      const firstUpstream = ctx.upstreamOutputs.values().next().value
      body = firstUpstream?.text ?? (firstUpstream?.data ? JSON.stringify(firstUpstream.data) : undefined)
    }

    if (body && body.length > MAX_BODY_SIZE) {
      return {
        output: { mediaType: 'text', text: '', data: { error: `Body exceeds max size of ${MAX_BODY_SIZE} bytes` }, durationMs: 0 },
      }
    }

    return {
      output: {
        mediaType: 'text',
        text: `[Webhook ${method} → ${url}]`,
        data: {
          __webhook_send_request: true,
          url,
          method,
          headers: headers ?? {},
          bodyLength: body?.length ?? 0,
          retries,
        },
        durationMs: 0,
      },
      variableMutations: { __webhook_target_url: url },
    }
  }
}
