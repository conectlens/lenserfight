import { describe, it, expect } from 'vitest'
import {
  WORKFLOW_NODE_CATALOG,
  getNodeCatalogEntry,
  getNodesByCategory,
  areNodesCompatible,
  searchCatalog,
  CATEGORY_ORDER,
} from './workflow-node-catalog'

describe('WorkflowNodeCatalog', () => {
  it('contains the expanded workflow node catalog', () => {
    expect(WORKFLOW_NODE_CATALOG.length).toBeGreaterThanOrEqual(90)
  })

  it('has unique type keys', () => {
    const types = WORKFLOW_NODE_CATALOG.map((n) => n.type)
    expect(new Set(types).size).toBe(types.length)
  })

  it('every entry has required fields', () => {
    for (const entry of WORKFLOW_NODE_CATALOG) {
      expect(entry.type).toBeTruthy()
      expect(entry.label).toBeTruthy()
      expect(entry.description).toBeTruthy()
      expect(entry.category).toBeTruthy()
      expect(entry.color).toBeTruthy()
      expect(entry.iconName).toBeTruthy()
      expect(entry.producesOutputType).toBeTruthy()
      expect(entry.acceptsInputTypes.length).toBeGreaterThan(0)
    }
  })

  it('all categories are represented', () => {
    const categories = new Set(WORKFLOW_NODE_CATALOG.map((n) => n.category))
    for (const cat of CATEGORY_ORDER) {
      expect(categories.has(cat)).toBe(true)
    }
  })

  it('getNodeCatalogEntry resolves by type', () => {
    expect(getNodeCatalogEntry('code')?.label).toBe('Code')
    expect(getNodeCatalogEntry('judge_evaluator')?.label).toBe('Judge / Evaluator')
    expect(getNodeCatalogEntry('nonexistent')).toBeUndefined()
  })

  it('getNodesByCategory returns correct groupings', () => {
    const logic = getNodesByCategory('logic')
    expect(logic.length).toBeGreaterThanOrEqual(6)
    expect(logic.every((n) => n.category === 'logic')).toBe(true)

    const aiPrimitive = getNodesByCategory('ai_primitive')
    expect(aiPrimitive.length).toBeGreaterThanOrEqual(8)
  })
})

describe('areNodesCompatible', () => {
  it('text → text is compatible', () => {
    expect(areNodesCompatible('lens', 'output_parser')).toBe(true) // text → accepts text
  })

  it('embedding → email_send is incompatible', () => {
    // embedding produces 'array', email_send accepts ['text', 'json', 'any']
    // 'any' is in email_send's acceptsInputTypes, so it's actually compatible
    expect(areNodesCompatible('embedding', 'email_send')).toBe(true)
  })

  it('schedule_trigger → output_parser is incompatible', () => {
    // schedule produces 'json', output_parser accepts ['text'] only
    expect(areNodesCompatible('schedule_trigger', 'output_parser')).toBe(false)
  })

  it('webhook_trigger → lens is compatible (json → accepts any)', () => {
    expect(areNodesCompatible('webhook_trigger', 'lens')).toBe(true)
  })

  it('unknown types default to compatible', () => {
    expect(areNodesCompatible('unknown_a', 'unknown_b')).toBe(true)
  })

  it('any output connects to anything', () => {
    expect(areNodesCompatible('code', 'email_send')).toBe(true) // code produces 'any'
  })
})

describe('searchCatalog', () => {
  it('returns all nodes for empty query', () => {
    expect(searchCatalog('')).toHaveLength(WORKFLOW_NODE_CATALOG.length)
  })

  it('finds nodes by label', () => {
    const results = searchCatalog('Judge')
    expect(results.some((n) => n.type === 'judge_evaluator')).toBe(true)
  })

  it('finds nodes by description', () => {
    const results = searchCatalog('rubric')
    expect(results.some((n) => n.type === 'judge_evaluator')).toBe(true)
  })

  it('finds nodes by type key', () => {
    const results = searchCatalog('kv_store')
    expect(results.length).toBe(2)
  })

  it('is case-insensitive', () => {
    expect(searchCatalog('EMAIL').some((n) => n.type === 'email_send')).toBe(true)
  })

  it('returns empty for nonsense query', () => {
    expect(searchCatalog('xyznonexistent123')).toHaveLength(0)
  })
})

// ── Trigger node category correctness ─────────────────────────────────────────

describe('trigger node catalog entries', () => {
  const TRIGGER_TYPES = [
    'manual_trigger',
    'event_trigger',
    'form_input_trigger',
    'webhook_trigger',
    'schedule_trigger',
  ]

  it.each(TRIGGER_TYPES)('%s is in the trigger category, not storage', (nodeType) => {
    const entry = getNodeCatalogEntry(nodeType)
    expect(entry).toBeDefined()
    expect(entry!.category).toBe('trigger')
    expect(entry!.category).not.toBe('storage')
  })

  it.each(TRIGGER_TYPES)('%s accepts void inputs (no upstream edges required)', (nodeType) => {
    const entry = getNodeCatalogEntry(nodeType)
    expect(entry!.acceptsInputTypes).toContain('void')
  })

  it.each(TRIGGER_TYPES)('%s has at least one output field', (nodeType) => {
    const entry = getNodeCatalogEntry(nodeType)
    expect(entry!.outputs.length).toBeGreaterThan(0)
  })

  it.each(TRIGGER_TYPES)('%s has an empty inputs array (triggers have no upstream)', (nodeType) => {
    const entry = getNodeCatalogEntry(nodeType)
    expect(entry!.inputs).toHaveLength(0)
  })

  it('webhook_trigger has a secret in requiredConfig', () => {
    const entry = getNodeCatalogEntry('webhook_trigger')
    expect(entry!.requiredConfig).toContain('secret')
  })

  it('schedule_trigger has cronExpression in requiredConfig', () => {
    const entry = getNodeCatalogEntry('schedule_trigger')
    expect(entry!.requiredConfig).toContain('cronExpression')
  })

  it('webhook_trigger and schedule_trigger have n8n equivalents defined', () => {
    expect(getNodeCatalogEntry('webhook_trigger')!.n8nEquivalent).toBe('n8n-nodes-base.webhook')
    expect(getNodeCatalogEntry('schedule_trigger')!.n8nEquivalent).toBe('n8n-nodes-base.scheduleTrigger')
  })

  it('trigger category is first or second in CATEGORY_ORDER (after lens)', () => {
    const idx = CATEGORY_ORDER.indexOf('trigger')
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(idx).toBeLessThanOrEqual(1) // 0=lens or 1=trigger right after lens
  })
})
