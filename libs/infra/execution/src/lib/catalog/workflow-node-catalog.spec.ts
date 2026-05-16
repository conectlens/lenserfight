import { describe, expect, it } from 'vitest'

import {
  WORKFLOW_NODE_CATALOG,
  WORKFLOW_NODE_CATEGORIES,
  areWorkflowNodesCompatible,
  getWorkflowNodeCatalogEntry,
  getWorkflowNodeCategoryCounts,
  getWorkflowNodesByCategory,
  searchWorkflowNodeCatalog,
  validateWorkflowNodeCatalog,
} from './workflow-node-catalog'

describe('workflow node catalog', () => {
  it('has unique node types and complete contracts', () => {
    const types = WORKFLOW_NODE_CATALOG.map((entry) => entry.type)

    expect(new Set(types).size).toBe(types.length)
    expect(validateWorkflowNodeCatalog()).toEqual([])
  })

  it('represents every n8n-style category with accurate counts', () => {
    const counts = getWorkflowNodeCategoryCounts()

    for (const category of WORKFLOW_NODE_CATEGORIES) {
      const nodes = getWorkflowNodesByCategory(category)
      expect(nodes.length).toBeGreaterThan(0)
      expect(counts[category]).toBe(nodes.length)
      expect(nodes.every((node) => node.category === category)).toBe(true)
    }
  })

  it('defines required catalog metadata for concrete high-value nodes', () => {
    for (const nodeType of [
      'email_send',
      'google_sheets_read',
      'google_sheets_write',
      'embedding',
      'rag_retrieval',
      'judge_evaluator',
      'battle_execute',
      'file_writer',
    ]) {
      const entry = getWorkflowNodeCatalogEntry(nodeType)

      expect(entry?.inputs.length).toBeGreaterThan(0)
      expect(entry?.outputs.length).toBeGreaterThan(0)
      expect(entry?.requiredConfig).toBeDefined()
      expect(entry?.optionalConfig).toBeDefined()
      expect(entry?.defaultConfig).toBeDefined()
      expect(entry?.supportedFundingModes.length).toBeGreaterThan(0)
      expect(entry?.supportedExecutionEnvironments.length).toBeGreaterThan(0)
      expect(entry?.retryBehavior.maxAttempts).toBeGreaterThan(0)
      expect(entry?.errorBehavior.defaultPolicy).toBeTruthy()
      expect(entry?.exampleConfig.config).toBeTruthy()
      expect(entry?.exampleConfig.expectedInput).toBeTruthy()
      expect(entry?.exampleConfig.expectedOutput).toBeTruthy()
      expect(entry?.exampleConfig.downstreamConnection.nodeType).toBeTruthy()
    }
  })

  it('searches names, categories, capabilities, and aliases', () => {
    expect(searchWorkflowNodeCatalog('email').some((node) => node.type === 'email_send')).toBe(true)
    expect(searchWorkflowNodeCatalog('battle').some((node) => node.type === 'battle_execute')).toBe(true)
    expect(searchWorkflowNodeCatalog('transform').some((node) => node.type === 'data_mapper')).toBe(true)
    expect(searchWorkflowNodeCatalog('rss').some((node) => node.type === 'rss_feed')).toBe(true)
  })
})

describe('workflow node compatibility', () => {
  it('warns for embedding output wired directly into email send', () => {
    expect(areWorkflowNodesCompatible('embedding', 'email_send')).toBe(false)
  })

  it('accepts common valid text, json, and document flows', () => {
    expect(areWorkflowNodesCompatible('prompt_template', 'lens_execute')).toBe(true)
    expect(areWorkflowNodesCompatible('webhook_trigger', 'data_mapper')).toBe(true)
    expect(areWorkflowNodesCompatible('text_splitter', 'embedding')).toBe(true)
  })

  it('allows transform/parser nodes to bridge incompatible flows', () => {
    expect(areWorkflowNodesCompatible('embedding', 'data_mapper')).toBe(true)
    expect(areWorkflowNodesCompatible('data_mapper', 'email_send')).toBe(true)
    expect(areWorkflowNodesCompatible('lens', 'output_parser')).toBe(true)
    expect(areWorkflowNodesCompatible('output_parser', 'email_send')).toBe(true)
  })
})
