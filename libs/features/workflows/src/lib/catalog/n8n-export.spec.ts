import { describe, it, expect } from 'vitest'
import { exportToN8n } from './n8n-export'

describe('n8n Export', () => {
  it('exports a basic workflow with correct structure', () => {
    const result = exportToN8n(
      'Test Workflow',
      [
        { id: 'n1', label: 'Research', nodeType: 'lens', ordinal: 0, config: { model_id: 'gpt-4o' } },
        { id: 'n2', label: 'Parse', nodeType: 'output_parser', ordinal: 1, config: { fields: ['name'] } },
      ],
      [{ sourceNodeId: 'n1', targetNodeId: 'n2' }],
      'wf-123',
    )

    expect(result.name).toBe('Test Workflow')
    expect(result.nodes).toHaveLength(2)
    expect(result._lenserfight.version).toBe('1.0.0')
    expect(result._lenserfight.originalWorkflowId).toBe('wf-123')
  })

  it('maps known node types to n8n equivalents', () => {
    const result = exportToN8n('WF', [
      { id: 'n1', label: 'Code', nodeType: 'code', ordinal: 0 },
      { id: 'n2', label: 'Webhook', nodeType: 'webhook_trigger', ordinal: 1 },
    ], [])

    expect(result.nodes[0].type).toBe('n8n-nodes-base.code')
    expect(result.nodes[1].type).toBe('n8n-nodes-base.webhook')
  })

  it('falls back to noOp for unmapped types', () => {
    const result = exportToN8n('WF', [
      { id: 'n1', label: 'Secret', nodeType: 'secret_resolver', ordinal: 0 },
    ], [])

    expect(result.nodes[0].type).toBe('n8n-nodes-base.noOp')
    expect(result._lenserfight.unmappedNodes).toContain('secret_resolver')
  })

  it('preserves LenserFight-specific metadata under _lenserfight extension', () => {
    const result = exportToN8n('WF', [
      { id: 'n1', label: 'Memory', nodeType: 'memory_write', ordinal: 0, config: { key: 'session' } },
    ], [])

    expect(result.nodes[0]._lenserfight?.originalType).toBe('memory_write')
    expect(result.nodes[0]._lenserfight?.config).toEqual({ key: 'session' })
  })

  it('builds connections in n8n format', () => {
    const result = exportToN8n('WF', [
      { id: 'n1', label: 'Source', nodeType: 'lens', ordinal: 0 },
      { id: 'n2', label: 'Target', nodeType: 'code', ordinal: 1 },
    ], [
      { sourceNodeId: 'n1', targetNodeId: 'n2' },
    ])

    expect(result.connections['Source'].main[0][0].node).toBe('Target')
    expect(result.connections['Source'].main[0][0].type).toBe('main')
  })

  it('handles empty workflow', () => {
    const result = exportToN8n('Empty', [], [])
    expect(result.nodes).toHaveLength(0)
    expect(result.connections).toEqual({})
  })

  it('maps manual_trigger to n8n-nodes-base.manualTrigger', () => {
    const result = exportToN8n('WF', [
      { id: 'n1', label: 'Start', nodeType: 'manual_trigger', ordinal: 0 },
    ], [])
    expect(result.nodes[0].type).toBe('n8n-nodes-base.manualTrigger')
    expect(result._lenserfight.unmappedNodes).not.toContain('manual_trigger')
  })

  it('maps schedule_trigger to n8n-nodes-base.scheduleTrigger', () => {
    const result = exportToN8n('WF', [
      { id: 'n1', label: 'Cron', nodeType: 'schedule_trigger', ordinal: 0 },
    ], [])
    expect(result.nodes[0].type).toBe('n8n-nodes-base.scheduleTrigger')
    expect(result._lenserfight.unmappedNodes).not.toContain('schedule_trigger')
  })

  it('maps webhook_trigger to n8n-nodes-base.webhook', () => {
    const result = exportToN8n('WF', [
      { id: 'n1', label: 'Inbound', nodeType: 'webhook_trigger', ordinal: 0 },
    ], [])
    expect(result.nodes[0].type).toBe('n8n-nodes-base.webhook')
    expect(result._lenserfight.unmappedNodes).not.toContain('webhook_trigger')
  })

  it('falls back to noOp for event_trigger (no n8n equivalent defined)', () => {
    const result = exportToN8n('WF', [
      { id: 'n1', label: 'Event', nodeType: 'event_trigger', ordinal: 0 },
    ], [])
    // event_trigger has no n8n counterpart in the infra catalog — noOp is the correct fallback
    expect(result.nodes[0].type).toBe('n8n-nodes-base.noOp')
    expect(result._lenserfight.unmappedNodes).toContain('event_trigger')
  })

  it('maps form_input_trigger to n8n-nodes-base.formTrigger', () => {
    const result = exportToN8n('WF', [
      { id: 'n1', label: 'Form', nodeType: 'form_input_trigger', ordinal: 0 },
    ], [])
    expect(result.nodes[0].type).toBe('n8n-nodes-base.formTrigger')
    expect(result._lenserfight.unmappedNodes).not.toContain('form_input_trigger')
  })
})
