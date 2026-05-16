import { describe, it, expect } from 'vitest'
import { EmailSendRunner, SlackNotifyRunner, DiscordNotifyRunner } from './communication.runner'
import { GitHubReadRunner, RssFeedRunner, NotionReadRunner, GoogleSheetsReadRunner, GoogleSheetsWriteRunner } from './integration.runner'
import type { NodeRunnerContext } from './node-runner.interface'
import type { ExecutionResult } from '../execution.types'

// ── EmailSendRunner ──────────────────────────────────────────────────────────

describe('EmailSendRunner', () => {
  const runner = new EmailSendRunner()

  it('declares node type as email_send', () => { expect(runner.nodeType).toBe('email_send') })

  it('rejects missing email address', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'e1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { subject: 'Hi' } }
    expect((await runner.execute(ctx)).output.data?.['error']).toContain('email address')
  })

  it('rejects missing subject', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'e1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { to: 'a@b.c' } }
    expect((await runner.execute(ctx)).output.data?.['error']).toContain('subject')
  })

  it('emits email request with valid config', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'e1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { to: 'user@example.com', subject: 'Test', bodyTemplate: 'Hello!' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__email_send_request']).toBe(true)
    expect(result.output.data?.['to']).toBe('user@example.com')
  })

  it('enforces rate limit', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'e1', upstreamOutputs: new Map(), resolvedParams: { __email_sent_count: 50 }, nodeConfig: { to: 'a@b.c', subject: 'X' } }
    expect((await runner.execute(ctx)).output.data?.['error']).toContain('rate limit')
  })

  it('increments sent count in variableMutations', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'e1', upstreamOutputs: new Map(), resolvedParams: { __email_sent_count: 3 }, nodeConfig: { to: 'a@b.c', subject: 'X' } }
    const result = await runner.execute(ctx)
    expect(result.variableMutations?.['__email_sent_count']).toBe(4)
  })
})

// ── SlackNotifyRunner ────────────────────────────────────────────────────────

describe('SlackNotifyRunner', () => {
  const runner = new SlackNotifyRunner()

  it('declares node type as slack_notify', () => { expect(runner.nodeType).toBe('slack_notify') })

  it('rejects missing webhook URL', async () => {
    const ctx: NodeRunnerContext = { nodeId: 's1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: {} }
    expect((await runner.execute(ctx)).output.data?.['error']).toContain('webhook URL')
  })

  it('rejects private URLs', async () => {
    const ctx: NodeRunnerContext = { nodeId: 's1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { webhookUrl: 'http://192.168.1.1/hook' } }
    expect((await runner.execute(ctx)).output.data?.['error']).toContain('private')
  })

  it('emits Slack request for valid URL', async () => {
    const ctx: NodeRunnerContext = { nodeId: 's1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx', messageTemplate: 'Done!' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__slack_notify_request']).toBe(true)
  })
})

// ── DiscordNotifyRunner ──────────────────────────────────────────────────────

describe('DiscordNotifyRunner', () => {
  const runner = new DiscordNotifyRunner()

  it('declares node type as discord_notify', () => { expect(runner.nodeType).toBe('discord_notify') })

  it('rejects missing webhook URL', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'd1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: {} }
    expect((await runner.execute(ctx)).output.data?.['error']).toContain('webhook URL')
  })

  it('emits Discord request for valid URL', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'd1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { webhookUrl: 'https://discord.com/api/webhooks/123/abc' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__discord_notify_request']).toBe(true)
  })
})

// ── GitHubReadRunner ─────────────────────────────────────────────────────────

describe('GitHubReadRunner', () => {
  const runner = new GitHubReadRunner()

  it('declares node type as github_read', () => { expect(runner.nodeType).toBe('github_read') })

  it('rejects invalid repo format', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'gh1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { repo: 'invalid' } }
    expect((await runner.execute(ctx)).output.data?.['error']).toContain('owner/repo')
  })

  it('emits GitHub request for valid repo', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'gh1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { repo: 'octocat/hello-world', resourceType: 'issue', number: 42 } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__github_read_request']).toBe(true)
    expect(result.output.data?.['repo']).toBe('octocat/hello-world')
    expect(result.output.data?.['number']).toBe(42)
  })

  it('accepts repo without number (lists)', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'gh1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { repo: 'org/repo' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__github_read_request']).toBe(true)
    expect(result.output.data?.['number']).toBeNull()
  })
})

// ── RssFeedRunner ────────────────────────────────────────────────────────────

describe('RssFeedRunner', () => {
  const runner = new RssFeedRunner()

  it('declares node type as rss_feed', () => { expect(runner.nodeType).toBe('rss_feed') })

  it('rejects missing feed URL', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'rss1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: {} }
    expect((await runner.execute(ctx)).output.data?.['error']).toContain('No feed URL')
  })

  it('rejects private URLs', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'rss1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { feedUrl: 'http://localhost:8080/feed' } }
    expect((await runner.execute(ctx)).output.data?.['error']).toContain('private')
  })

  it('emits RSS request for valid URL', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'rss1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { feedUrl: 'https://blog.example.com/feed.xml', maxItems: 5 } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__rss_feed_request']).toBe(true)
    expect(result.output.data?.['maxItems']).toBe(5)
  })

  it('caps maxItems at 50', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'rss1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { feedUrl: 'https://x.com/feed', maxItems: 999 } }
    expect((await runner.execute(ctx)).output.data?.['maxItems']).toBe(50)
  })
})

// ── NotionReadRunner ─────────────────────────────────────────────────────────

describe('NotionReadRunner', () => {
  const runner = new NotionReadRunner()

  it('declares node type as notion_read', () => { expect(runner.nodeType).toBe('notion_read') })

  it('rejects when neither pageId nor databaseId provided', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'nr1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: {} }
    expect((await runner.execute(ctx)).output.data?.['error']).toContain('pageId or databaseId')
  })

  it('emits page read request', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'nr1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { pageId: 'abc-123' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__notion_read_request']).toBe(true)
    expect(result.output.data?.['pageId']).toBe('abc-123')
  })

  it('emits database query request', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'nr1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { databaseId: 'db-456' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__notion_read_request']).toBe(true)
    expect(result.output.data?.['databaseId']).toBe('db-456')
  })
})

// ── GoogleSheetsReadRunner ──────────────────────────────────────────────────

describe('GoogleSheetsReadRunner', () => {
  const runner = new GoogleSheetsReadRunner()

  it('declares node type as google_sheets_read', () => { expect(runner.nodeType).toBe('google_sheets_read') })

  it('rejects invalid spreadsheetId', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'gs1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { spreadsheetId: 'short', range: 'A1' } }
    expect((await runner.execute(ctx)).output.data?.['error']).toContain('spreadsheetId')
  })

  it('rejects missing range', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'gs1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms' } }
    expect((await runner.execute(ctx)).output.data?.['error']).toContain('range')
  })

  it('emits read request with valid config', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'gs1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms', range: 'Sheet1!A1:D10' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__google_sheets_read_request']).toBe(true)
  })
})

// ── GoogleSheetsWriteRunner ─────────────────────────────────────────────────

describe('GoogleSheetsWriteRunner', () => {
  const runner = new GoogleSheetsWriteRunner()

  it('declares node type as google_sheets_write', () => { expect(runner.nodeType).toBe('google_sheets_write') })

  it('rejects when no data to write', async () => {
    const ctx: NodeRunnerContext = { nodeId: 'gs1', upstreamOutputs: new Map(), resolvedParams: {}, nodeConfig: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms', range: 'A1' } }
    expect((await runner.execute(ctx)).output.data?.['error']).toContain('No data')
  })

  it('emits write request with upstream data', async () => {
    const upstream: ExecutionResult = { mediaType: 'text', text: '', data: { rows: [[1, 2], [3, 4]] }, durationMs: 0 }
    const ctx: NodeRunnerContext = { nodeId: 'gs1', upstreamOutputs: new Map([['n1', upstream]]), resolvedParams: {}, nodeConfig: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms', range: 'Sheet1!A1', mode: 'append' } }
    const result = await runner.execute(ctx)
    expect(result.output.data?.['__google_sheets_write_request']).toBe(true)
    expect(result.output.data?.['mode']).toBe('append')
  })
})
