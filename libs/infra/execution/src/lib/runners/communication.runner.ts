/**
 * Communication Runners — email, Slack, Discord outbound notifications.
 *
 * All communication nodes validate their target, structure a request envelope,
 * and delegate actual delivery to the engine (or platform-api worker).
 *
 * Security:
 * - URLs validated (no private IPs).
 * - Email rate-capped at 50/hr per workflow.
 * - Credentials resolved from encrypted vault (never exposed to frontend).
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const EMAIL_RATE_LIMIT_PER_HOUR = 50
const MAX_BODY_LENGTH = 100_000

const PRIVATE_IP_PATTERNS = [
  /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
  /^127\./, /^0\./, /^localhost$/i, /^::1$/, /^\[::1\]$/,
]

function isPrivateUrl(url: string): boolean {
  try { return PRIVATE_IP_PATTERNS.some((p) => p.test(new URL(url).hostname)) }
  catch { return true }
}

// ── EmailSendRunner ──────────────────────────────────────────────────────────

export class EmailSendRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'email_send'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const to = ctx.nodeConfig['to'] as string | undefined
    const subject = ctx.nodeConfig['subject'] as string | undefined
    const bodyTemplate = ctx.nodeConfig['bodyTemplate'] as string | undefined

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return { output: { mediaType: 'text', text: '', data: { error: 'Invalid or missing "to" email address' }, durationMs: 0 } }
    }

    if (!subject) {
      return { output: { mediaType: 'text', text: '', data: { error: 'Missing email subject' }, durationMs: 0 } }
    }

    // Resolve body from template or upstream
    let body = bodyTemplate
    if (!body) {
      const firstUpstream = ctx.upstreamOutputs.values().next().value
      body = firstUpstream?.text ?? ''
    }

    if (body.length > MAX_BODY_LENGTH) {
      body = body.slice(0, MAX_BODY_LENGTH)
    }

    // Check rate limit counter from resolvedParams
    const sentCount = (ctx.resolvedParams['__email_sent_count'] as number) ?? 0
    if (sentCount >= EMAIL_RATE_LIMIT_PER_HOUR) {
      return { output: { mediaType: 'text', text: '', data: { error: `Email rate limit exceeded (${EMAIL_RATE_LIMIT_PER_HOUR}/hr)`, sentCount }, durationMs: 0 } }
    }

    return {
      output: {
        mediaType: 'text',
        text: `[Email → ${to}: ${subject}]`,
        data: { __email_send_request: true, to, subject, bodyLength: body.length, rateLimitRemaining: EMAIL_RATE_LIMIT_PER_HOUR - sentCount - 1 },
        durationMs: 0,
      },
      variableMutations: { __email_sent_count: sentCount + 1 },
    }
  }
}

// ── SlackNotifyRunner ────────────────────────────────────────────────────────

export class SlackNotifyRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'slack_notify'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const webhookUrl = ctx.nodeConfig['webhookUrl'] as string | undefined
    const messageTemplate = ctx.nodeConfig['messageTemplate'] as string | undefined

    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return { output: { mediaType: 'text', text: '', data: { error: 'No Slack webhook URL configured' }, durationMs: 0 } }
    }

    if (isPrivateUrl(webhookUrl)) {
      return { output: { mediaType: 'text', text: '', data: { error: 'Cannot send to private URLs' }, durationMs: 0 } }
    }

    let message = messageTemplate
    if (!message) {
      const firstUpstream = ctx.upstreamOutputs.values().next().value
      message = firstUpstream?.text ?? 'Workflow notification'
    }

    return {
      output: {
        mediaType: 'text',
        text: `[Slack → ${webhookUrl.slice(0, 40)}...]`,
        data: { __slack_notify_request: true, webhookUrl, messageLength: message.length },
        durationMs: 0,
      },
    }
  }
}

// ── DiscordNotifyRunner ──────────────────────────────────────────────────────

export class DiscordNotifyRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'discord_notify'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const webhookUrl = ctx.nodeConfig['webhookUrl'] as string | undefined
    const messageTemplate = ctx.nodeConfig['messageTemplate'] as string | undefined

    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return { output: { mediaType: 'text', text: '', data: { error: 'No Discord webhook URL configured' }, durationMs: 0 } }
    }

    if (isPrivateUrl(webhookUrl)) {
      return { output: { mediaType: 'text', text: '', data: { error: 'Cannot send to private URLs' }, durationMs: 0 } }
    }

    let message = messageTemplate
    if (!message) {
      const firstUpstream = ctx.upstreamOutputs.values().next().value
      message = firstUpstream?.text ?? 'Workflow notification'
    }

    // Discord has 2000 char limit
    if (message.length > 2000) {
      message = message.slice(0, 1997) + '...'
    }

    return {
      output: {
        mediaType: 'text',
        text: `[Discord → ${webhookUrl.slice(0, 40)}...]`,
        data: { __discord_notify_request: true, webhookUrl, messageLength: message.length },
        durationMs: 0,
      },
    }
  }
}
