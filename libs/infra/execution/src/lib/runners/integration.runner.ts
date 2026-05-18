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

import type { ExecutionResult, WorkflowNodeType } from '../execution.types'
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

async function executeConnectorOrMock(
  ctx: NodeRunnerContext,
  request: Parameters<NonNullable<NodeRunnerContext['executeConnectorOperation']>>[0],
  fallbackText: string,
  fallbackData: Record<string, unknown>,
): Promise<NodeRunnerResult> {
  if (ctx.executeConnectorOperation) {
    return { output: await ctx.executeConnectorOperation(request) }
  }
  return {
    output: {
      mediaType: 'json',
      text: fallbackText,
      data: {
        ...fallbackData,
        connectorRef: request.connectorRef,
        provider: request.provider,
        capability: request.capability,
        operation: request.operation,
        mock: true,
      },
      durationMs: 0,
    },
  }
}

// ── GitHubReadRunner ─────────────────────────────────────────────────────────

export class GitHubReadRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'github_read'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const repo = ctx.nodeConfig['repo'] as string | undefined
    const resourceType = (ctx.nodeConfig['resourceType'] as string) ?? 'issue'
    const number = ctx.nodeConfig['number'] as number | string | undefined
    const connectorRef = ctx.nodeConfig['connectorRef'] as string | undefined

    if (!repo || !GITHUB_REPO_REGEX.test(repo)) {
      return { output: { mediaType: 'text', text: '', data: { error: 'Invalid repo format. Expected "owner/repo"' }, durationMs: 0 } }
    }

    const resourceNumber = number ? Number(number) : undefined
    if (resourceNumber !== undefined && (!Number.isFinite(resourceNumber) || resourceNumber < 1)) {
      return { output: { mediaType: 'text', text: '', data: { error: 'Invalid issue/PR number' }, durationMs: 0 } }
    }

    const result: NodeRunnerResult = connectorRef
      ? await executeConnectorOrMock(
        ctx,
        {
          connectorRef,
          provider: 'github',
          capability: 'repos',
          operation: 'read_repository_metadata',
          requiredScopes: ['repo'],
          params: { repo, resourceType, number: resourceNumber ?? null },
        },
        `[GitHub ${resourceType} ${repo}${resourceNumber ? `#${resourceNumber}` : ''}]`,
        { __github_read_request: true, repo, resourceType, number: resourceNumber ?? null },
      )
      : {
        output: {
          mediaType: 'text' as ExecutionResult['mediaType'],
          text: `[GitHub ${resourceType} ${repo}${resourceNumber ? `#${resourceNumber}` : ''}]`,
          data: {
            __github_read_request: true,
            repo,
            resourceType,
            number: resourceNumber ?? null,
          },
          durationMs: 0,
        },
      }

    return {
      ...result,
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
    const connectorRef = ctx.nodeConfig['connectorRef'] as string | undefined

    if (!pageId && !databaseId) {
      return { output: { mediaType: 'text', text: '', data: { error: 'Either pageId or databaseId must be configured' }, durationMs: 0 } }
    }

    if (connectorRef) {
      return executeConnectorOrMock(
        ctx,
        {
          connectorRef,
          provider: 'notion',
          capability: databaseId ? 'database' : 'page',
          operation: databaseId ? 'query_database' : 'read_database',
          requiredScopes: ['notion:read'],
          params: { pageId: pageId ?? null, databaseId: databaseId ?? null, queryFilter: queryFilter ?? null },
        },
        `[Notion ${pageId ? `Page: ${pageId}` : `DB: ${databaseId}`}]`,
        {
          __notion_read_request: true,
          pageId: pageId ?? null,
          databaseId: databaseId ?? null,
          queryFilter: queryFilter ?? null,
        },
      )
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
// When present, a server-side connector runtime resolves credentials and
// returns sanitized workflow output. Tokens must never enter node output data.

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

    if (connectorRef) {
      return executeConnectorOrMock(
        ctx,
        {
          connectorRef,
          provider: 'google',
          capability: 'sheets',
          operation: 'read_range',
          requiredScopes: SHEETS_REQUIRED_SCOPES,
          params: { spreadsheetId, range },
        },
        `[Sheets Read: ${range}]`,
        { __google_sheets_read_request: true, spreadsheetId, range },
      )
    }

    return {
      output: {
        mediaType: 'text',
        text: `[Sheets Read: ${range}]`,
        data: {
          __google_sheets_read_request: true,
          spreadsheetId,
          range,
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

    // Get data to write from upstream
    const firstUpstream = ctx.upstreamOutputs.values().next().value
    const writeData = firstUpstream?.data ?? (firstUpstream?.text ? [firstUpstream.text] : null)

    if (!writeData) {
      return { output: { mediaType: 'text', text: '', data: { error: 'No data to write' }, durationMs: 0 } }
    }

    if (connectorRef) {
      return executeConnectorOrMock(
        ctx,
        {
          connectorRef,
          provider: 'google',
          capability: 'sheets',
          operation: mode === 'overwrite' ? 'update_range' : 'append_row',
          requiredScopes: SHEETS_REQUIRED_SCOPES,
          params: { spreadsheetId, range, mode, writeData },
        },
        `[Sheets ${mode}: ${range}]`,
        { __google_sheets_write_request: true, spreadsheetId, range, mode, hasData: true },
      )
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
        },
        durationMs: 0,
      },
    }
  }
}
