import { describe, it, expect } from 'vitest'
import { SqlQueryRunner } from './sql-query.runner'
import { ObjectStorageUploadRunner, ObjectStorageDownloadRunner } from './object-storage.runner'
import { HttpRequestRunner } from './http-request.runner'
import { GraphqlRequestRunner } from './graphql-request.runner'
import { TelegramNotifyRunner } from './telegram-notify.runner'
import { PushNotificationRunner } from './push-notification.runner'
import { SmsSendRunner } from './sms-send.runner'
import { GithubPrReviewRunner } from './github-pr-review.runner'
import { GithubIssueCreateRunner } from './github-issue-create.runner'
import { NotionWriteRunner } from './notion-write.runner'
import { CalendarCreateRunner } from './calendar-create.runner'
import { LinearIssueCreateRunner } from './linear-issue-create.runner'
import { JiraIssueCreateRunner } from './jira-issue-create.runner'
import type { NodeRunnerContext } from './node-runner.interface'

const ctx: NodeRunnerContext = {
  nodeId: 'n1',
  upstreamOutputs: new Map(),
  resolvedParams: {},
  nodeConfig: {},
}

// ── CP Storage Extended ──────────────────────────────────────────────────────

describe('SqlQueryRunner', () => {
  const runner = new SqlQueryRunner()

  it('declares node type as sql_query', () => { expect(runner.nodeType).toBe('sql_query') })
  it('returns stub result without throwing', async () => {
    const result = await runner.execute(ctx)
    expect(result.output).toBeDefined()
    expect(result.output.data?.['nodeId']).toBe('n1')
  })
})

describe('ObjectStorageUploadRunner', () => {
  const runner = new ObjectStorageUploadRunner()

  it('declares node type as object_storage_upload', () => { expect(runner.nodeType).toBe('object_storage_upload') })
  it('returns stub result without throwing', async () => {
    const result = await runner.execute(ctx)
    expect(result.output).toBeDefined()
    expect(result.output.data?.['nodeId']).toBe('n1')
  })
})

describe('ObjectStorageDownloadRunner', () => {
  const runner = new ObjectStorageDownloadRunner()

  it('declares node type as object_storage_download', () => { expect(runner.nodeType).toBe('object_storage_download') })
  it('returns stub result without throwing', async () => {
    const result = await runner.execute(ctx)
    expect(result.output).toBeDefined()
    expect(result.output.data?.['nodeId']).toBe('n1')
  })
})

describe('HttpRequestRunner', () => {
  const runner = new HttpRequestRunner()

  it('declares node type as http_request', () => { expect(runner.nodeType).toBe('http_request') })
  it('returns stub result without throwing', async () => {
    const result = await runner.execute(ctx)
    expect(result.output).toBeDefined()
    expect(result.output.data?.['nodeId']).toBe('n1')
  })
})

describe('GraphqlRequestRunner', () => {
  const runner = new GraphqlRequestRunner()

  it('declares node type as graphql_request', () => { expect(runner.nodeType).toBe('graphql_request') })
  it('returns stub result without throwing', async () => {
    const result = await runner.execute(ctx)
    expect(result.output).toBeDefined()
    expect(result.output.data?.['nodeId']).toBe('n1')
  })
})

// ── CQ Communication Extended ────────────────────────────────────────────────

describe('TelegramNotifyRunner', () => {
  const runner = new TelegramNotifyRunner()

  it('declares node type as telegram_notify', () => { expect(runner.nodeType).toBe('telegram_notify') })
  it('returns stub result without throwing', async () => {
    const result = await runner.execute(ctx)
    expect(result.output).toBeDefined()
    expect(result.output.data?.['nodeId']).toBe('n1')
  })
})

describe('PushNotificationRunner', () => {
  const runner = new PushNotificationRunner()

  it('declares node type as push_notification', () => { expect(runner.nodeType).toBe('push_notification') })
  it('returns stub result without throwing', async () => {
    const result = await runner.execute(ctx)
    expect(result.output).toBeDefined()
    expect(result.output.data?.['nodeId']).toBe('n1')
  })
})

describe('SmsSendRunner', () => {
  const runner = new SmsSendRunner()

  it('declares node type as sms_send', () => { expect(runner.nodeType).toBe('sms_send') })
  it('returns stub result without throwing', async () => {
    const result = await runner.execute(ctx)
    expect(result.output).toBeDefined()
    expect(result.output.data?.['nodeId']).toBe('n1')
  })
})

// ── CQ Integration Extended ──────────────────────────────────────────────────

describe('GithubPrReviewRunner', () => {
  const runner = new GithubPrReviewRunner()

  it('declares node type as github_pr_review', () => { expect(runner.nodeType).toBe('github_pr_review') })
  it('returns stub result without throwing', async () => {
    const result = await runner.execute(ctx)
    expect(result.output).toBeDefined()
    expect(result.output.data?.['nodeId']).toBe('n1')
  })
})

describe('GithubIssueCreateRunner', () => {
  const runner = new GithubIssueCreateRunner()

  it('declares node type as github_issue_create', () => { expect(runner.nodeType).toBe('github_issue_create') })
  it('returns stub result without throwing', async () => {
    const result = await runner.execute(ctx)
    expect(result.output).toBeDefined()
    expect(result.output.data?.['nodeId']).toBe('n1')
  })
})

describe('NotionWriteRunner', () => {
  const runner = new NotionWriteRunner()

  it('declares node type as notion_write', () => { expect(runner.nodeType).toBe('notion_write') })
  it('returns stub result without throwing', async () => {
    const result = await runner.execute(ctx)
    expect(result.output).toBeDefined()
    expect(result.output.data?.['nodeId']).toBe('n1')
  })
})

describe('CalendarCreateRunner', () => {
  const runner = new CalendarCreateRunner()

  it('declares node type as calendar_create', () => { expect(runner.nodeType).toBe('calendar_create') })
  it('returns stub result without throwing', async () => {
    const result = await runner.execute(ctx)
    expect(result.output).toBeDefined()
    expect(result.output.data?.['nodeId']).toBe('n1')
  })
})

describe('LinearIssueCreateRunner', () => {
  const runner = new LinearIssueCreateRunner()

  it('declares node type as linear_issue_create', () => { expect(runner.nodeType).toBe('linear_issue_create') })
  it('returns stub result without throwing', async () => {
    const result = await runner.execute(ctx)
    expect(result.output).toBeDefined()
    expect(result.output.data?.['nodeId']).toBe('n1')
  })
})

describe('JiraIssueCreateRunner', () => {
  const runner = new JiraIssueCreateRunner()

  it('declares node type as jira_issue_create', () => { expect(runner.nodeType).toBe('jira_issue_create') })
  it('returns stub result without throwing', async () => {
    const result = await runner.execute(ctx)
    expect(result.output).toBeDefined()
    expect(result.output.data?.['nodeId']).toBe('n1')
  })
})
