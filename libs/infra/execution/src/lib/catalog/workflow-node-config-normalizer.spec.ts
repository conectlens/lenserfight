import { describe, expect, it } from 'vitest'

import { normalizeWorkflowNodeConfigForExecution } from './workflow-node-config-normalizer'

describe('normalizeWorkflowNodeConfigForExecution', () => {
  it('normalizes Email Send persisted config into runner config', () => {
    const config = normalizeWorkflowNodeConfigForExecution({
      node_type: 'email_send',
      param_overrides: {
        __to: 'founder@example.com',
        __subject: 'Weekly digest',
        __body: 'Top battles: {{$.summary}}',
        __attachments: '[{"name":"leaderboard.csv","filePath":"$.file.url"}]',
      },
      retry: { attempts: 3, backoffMs: 2000 },
    })

    expect(config?.nodeType).toBe('email_send')
    expect(config?.to).toBe('founder@example.com')
    expect(config?.subject).toBe('Weekly digest')
    expect(config?.body).toBe('Top battles: {{$.summary}}')
    expect(config?.attachments).toEqual([{ name: 'leaderboard.csv', filePath: '$.file.url' }])
    expect(config?.retry).toEqual({ attempts: 3, backoffMs: 2000 })
  })

  it('normalizes Google Sheets read/write fields', () => {
    const read = normalizeWorkflowNodeConfigForExecution({
      node_type: 'google_sheets_read',
      param_overrides: {
        __spreadsheetId: '1xWeeklyMetricsSheetId',
        __sheetName: 'Battle Metrics',
        __range: 'A2:G200',
      },
    })
    const write = normalizeWorkflowNodeConfigForExecution({
      node_type: 'google_sheets_write',
      param_overrides: {
        __spreadsheetId: '1xWeeklyMetricsSheetId',
        __sheetName: 'Digest Log',
        __rowsPath: '$.rows',
      },
    })

    expect(read?.nodeType).toBe('google_sheets_read')
    expect(read?.spreadsheetId).toBe('1xWeeklyMetricsSheetId')
    expect(write?.nodeType).toBe('google_sheets_write')
    expect(write?.rowsPath).toBe('$.rows')
  })

  it('normalizes Embedding config with typed numeric and array values', () => {
    const config = normalizeWorkflowNodeConfigForExecution({
      node_type: 'embedding',
      model_id: 'text-embedding-3-small',
      param_overrides: {
        __provider: 'openai',
        __model: 'text-embedding-3-small',
        __dimensions: '1536',
        __chunkSize: '1000',
        __metadataFields: '["battleId","contenderId"]',
      },
    })

    expect(config?.nodeType).toBe('embedding')
    expect(config?.modelId).toBe('text-embedding-3-small')
    expect(config?.dimensions).toBe(1536)
    expect(config?.chunkSize).toBe(1000)
    expect(config?.metadataFields).toEqual(['battleId', 'contenderId'])
  })

  it('normalizes RAG Retriever config with filters and rerank', () => {
    const config = normalizeWorkflowNodeConfigForExecution({
      node_type: 'rag_retrieval',
      param_overrides: {
        __vectorStore: 'supabase:workflow_documents',
        __queryPath: '$.query',
        __topK: '6',
        __similarityThreshold: '0.74',
        __filters: '{"workspaceId":"workspace_123"}',
        __rerank: 'true',
      },
    })

    expect(config?.nodeType).toBe('rag_retrieval')
    expect(config?.topK).toBe(6)
    expect(config?.similarityThreshold).toBe(0.74)
    expect(config?.filters).toEqual({ workspaceId: 'workspace_123' })
    expect(config?.rerank).toBe(true)
  })

  it('normalizes Judge/Eval and Battle Execute configs', () => {
    const judge = normalizeWorkflowNodeConfigForExecution({
      node_type: 'judge_evaluator',
      param_overrides: {
        __rubric: 'Score correctness and source coverage.',
        __scoringScale: '0-100',
        __confidenceThreshold: '0.76',
      },
    })
    const battle = normalizeWorkflowNodeConfigForExecution({
      node_type: 'battle_execute',
      param_overrides: {
        __contenders: '[{"id":"concise","lensId":"lens_a"},{"id":"sourced","lensId":"lens_b"}]',
        __judgeStrategy: 'panel',
        __resultVisibility: 'workspace',
      },
    })

    expect(judge?.nodeType).toBe('judge_evaluator')
    expect(judge?.confidenceThreshold).toBe(0.76)
    expect(battle?.nodeType).toBe('battle_execute')
    expect(battle?.contenders).toEqual([
      { id: 'concise', lensId: 'lens_a' },
      { id: 'sourced', lensId: 'lens_b' },
    ])
  })
})
