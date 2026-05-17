/**
 * Integration Runners — GitHub, RSS, Notion, Google Sheets.
 *
 * Each runner validates config, structures the request envelope,
 * and delegates actual API calls to the engine/worker.
 *
 * Security:
 * - Credentials resolved from encrypted vault (never in frontend).
 * - GitHub repo format validated.
 * - RSS URLs validated (no private IPs).
 * - Google Sheets spreadsheet ID format validated.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const GITHUB_REPO_REGEX = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/
const SPREADSHEET_ID_REGEX = /^[a-zA-Z0-9_-]{20,60}$/

const PRIVATE_IP_PATTERNS = [
  /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
  /^127\./, /^0\./, /^localhost$/i,
]

function isPrivateUrl(url: string): boolean {
  try { return PRIVATE_IP_PATTERNS.some((p) => p.test(new URL(url).hostname)) }
  catch { return true }
}

// ── GitHubReadRunner ─────────────────────────────────────────────────────────

export class GitHubReadRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'github_read'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const repo = ctx.nodeConfig['repo'] as string | undefined
    const resourceType = (ctx.nodeConfig['resourceType'] as string) ?? 'issue'
    const number = ctx.nodeConfig['number'] as number | string | undefined

    if (!repo || !GITHUB_REPO_REGEX.test(repo)) {
      return { output: { mediaType: 'text', text: '', data: { error: 'Invalid repo format. Expected "owner/repo"' }, durationMs: 0 } }
    }

    const resourceNumber = number ? Number(number) : undefined
    if (resourceNumber !== undefined && (!Number.isFinite(resourceNumber) || resourceNumber < 1)) {
      return { output: { mediaType: 'text', text: '', data: { error: 'Invalid issue/PR number' }, durationMs: 0 } }
    }

    return {
      output: {
        mediaType: 'text',
        text: `[GitHub ${resourceType} ${repo}${resourceNumber ? `#${resourceNumber}` : ''}]`,
        data: {
          __github_read_request: true,
          repo,
          resourceType,
          number: resourceNumber ?? null,
        },
        durationMs: 0,
      },
      variableMutations: { __github_repo: repo },
    }
  }
}

// ── RssFeedRunner ────────────────────────────────────────────────────────────

export class RssFeedRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'rss_feed'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const feedUrl = ctx.nodeConfig['feedUrl'] as string | undefined
    const maxItems = Math.max(1, Math.min(Number(ctx.nodeConfig['maxItems'] ?? 10), 50))

    if (!feedUrl || typeof feedUrl !== 'string') {
      return { output: { mediaType: 'text', text: '', data: { error: 'No feed URL configured' }, durationMs: 0 } }
    }

    try { new URL(feedUrl) } catch {
      return { output: { mediaType: 'text', text: '', data: { error: 'Invalid URL format' }, durationMs: 0 } }
    }

    if (isPrivateUrl(feedUrl)) {
      return { output: { mediaType: 'text', text: '', data: { error: 'Cannot fetch from private URLs' }, durationMs: 0 } }
    }

    return {
      output: {
        mediaType: 'text',
        text: `[RSS Feed: ${feedUrl}]`,
        data: { __rss_feed_request: true, feedUrl, maxItems },
        durationMs: 0,
      },
      variableMutations: { __rss_feed_url: feedUrl },
    }
  }
}

// ── NotionReadRunner ─────────────────────────────────────────────────────────

export class NotionReadRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'notion_read'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const pageId = ctx.nodeConfig['pageId'] as string | undefined
    const databaseId = ctx.nodeConfig['databaseId'] as string | undefined
    const queryFilter = ctx.nodeConfig['queryFilter'] as Record<string, unknown> | undefined

    if (!pageId && !databaseId) {
      return { output: { mediaType: 'text', text: '', data: { error: 'Either pageId or databaseId must be configured' }, durationMs: 0 } }
    }

    return {
      output: {
        mediaType: 'text',
        text: `[Notion ${pageId ? `Page: ${pageId}` : `DB: ${databaseId}`}]`,
        data: {
          __notion_read_request: true,
          pageId: pageId ?? null,
          databaseId: databaseId ?? null,
          queryFilter: queryFilter ?? null,
        },
        durationMs: 0,
      },
    }
  }
}

// ── GoogleSheetsReadRunner / GoogleSheetsWriteRunner ──────────────────────────
// connectorRef: optional [[:connector:google.sheets.primary]] reference.
// When present, the resolver fetches the user's OAuth access token server-side.
// The token is included in the request envelope for the worker to use when
// calling the Google Sheets API. Execution proceeds without a token if
// connectorRef is absent (e.g. dry-run) — the request envelope marks it.

const SHEETS_REQUIRED_SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

export class GoogleSheetsReadRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'google_sheets_read'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const spreadsheetId = ctx.nodeConfig['spreadsheetId'] as string | undefined
    const range = ctx.nodeConfig['range'] as string | undefined
    const connectorRef = ctx.nodeConfig['connectorRef'] as string | undefined

    if (!spreadsheetId || !SPREADSHEET_ID_REGEX.test(spreadsheetId)) {
      return { output: { mediaType: 'text', text: '', data: { error: 'Invalid or missing spreadsheetId' }, durationMs: 0 } }
    }

    if (!range || typeof range !== 'string') {
      return { output: { mediaType: 'text', text: '', data: { error: 'Missing range (e.g. "Sheet1!A1:D10")' }, durationMs: 0 } }
    }

    // Resolve OAuth token server-side (returns null in browser/dry-run)
    let accessToken: string | null = null
    if (connectorRef && ctx.resolveConnector) {
      accessToken = await ctx.resolveConnector(connectorRef, SHEETS_REQUIRED_SCOPES)
      if (!accessToken) {
        return {
          output: {
            mediaType: 'text',
            text: '',
            data: {
              error: 'connector_not_resolved',
              detail: `Could not resolve connector: ${connectorRef}. Ensure a Google Sheets connection is active at /settings/connections.`,
            },
            durationMs: 0,
          },
        }
      }
    }

    return {
      output: {
        mediaType: 'text',
        text: `[Sheets Read: ${range}]`,
        data: {
          __google_sheets_read_request: true,
          spreadsheetId,
          range,
          // accessToken is included for the worker; never logged or sent to frontend
          ...(accessToken ? { __oauth_access_token: accessToken } : {}),
        },
        durationMs: 0,
      },
    }
  }
}

export class GoogleSheetsWriteRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'google_sheets_write'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const spreadsheetId = ctx.nodeConfig['spreadsheetId'] as string | undefined
    const range = ctx.nodeConfig['range'] as string | undefined
    const mode = (ctx.nodeConfig['mode'] as string) ?? 'append'
    const connectorRef = ctx.nodeConfig['connectorRef'] as string | undefined

    if (!spreadsheetId || !SPREADSHEET_ID_REGEX.test(spreadsheetId)) {
      return { output: { mediaType: 'text', text: '', data: { error: 'Invalid or missing spreadsheetId' }, durationMs: 0 } }
    }

    if (!range || typeof range !== 'string') {
      return { output: { mediaType: 'text', text: '', data: { error: 'Missing range' }, durationMs: 0 } }
    }

    // Resolve OAuth token server-side
    let accessToken: string | null = null
    if (connectorRef && ctx.resolveConnector) {
      accessToken = await ctx.resolveConnector(connectorRef, SHEETS_REQUIRED_SCOPES)
      if (!accessToken) {
        return {
          output: {
            mediaType: 'text',
            text: '',
            data: {
              error: 'connector_not_resolved',
              detail: `Could not resolve connector: ${connectorRef}`,
            },
            durationMs: 0,
          },
        }
      }
    }

    // Get data to write from upstream
    const firstUpstream = ctx.upstreamOutputs.values().next().value
    const writeData = firstUpstream?.data ?? (firstUpstream?.text ? [firstUpstream.text] : null)

    if (!writeData) {
      return { output: { mediaType: 'text', text: '', data: { error: 'No data to write' }, durationMs: 0 } }
    }

    return {
      output: {
        mediaType: 'text',
        text: `[Sheets ${mode}: ${range}]`,
        data: {
          __google_sheets_write_request: true,
          spreadsheetId,
          range,
          mode,
          hasData: true,
          ...(accessToken ? { __oauth_access_token: accessToken } : {}),
        },
        durationMs: 0,
      },
    }
  }
}
