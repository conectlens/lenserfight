/**
 * Catalog–Runner Coverage
 *
 * Ensures that every node type defined in WORKFLOW_NODE_CATALOG has:
 *   1. A registered runner via registerDefaultNodeRunners()
 *
 * This prevents "orphan" catalog entries that show up in the palette but
 * crash at execution time because no runner handles them.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { WORKFLOW_NODE_CATALOG } from './workflow-node-catalog'
import { registerDefaultNodeRunners, hasNodeRunner, clearNodeRunners } from '../runners'

beforeAll(() => {
  clearNodeRunners()
  registerDefaultNodeRunners()
})

/**
 * Node types that are executed via a special path in WorkflowExecutionService
 * rather than through the runner registry. These are intentionally excluded from
 * the runner coverage check.
 */
const SERVICE_HANDLED_TYPES = new Set(['lens'])

describe('catalog runner coverage', () => {
  it('every catalog entry has a registered runner (except service-handled types)', () => {
    const missing: string[] = []

    for (const entry of WORKFLOW_NODE_CATALOG) {
      if (SERVICE_HANDLED_TYPES.has(entry.type)) continue
      if (!hasNodeRunner(entry.type)) {
        missing.push(entry.type)
      }
    }

    expect(missing).toEqual([])
  })

  it('catalog has no duplicate types', () => {
    const types = WORKFLOW_NODE_CATALOG.map((e) => e.type)
    expect(new Set(types).size).toBe(types.length)
  })

  it('all 11 categories are present in the catalog', () => {
    const categories = new Set(WORKFLOW_NODE_CATALOG.map((e) => e.category))
    const expected = [
      'lens', 'trigger', 'logic', 'data', 'ai_primitive',
      'battle', 'storage', 'communication', 'integration', 'media', 'utility',
    ]
    for (const cat of expected) {
      expect(categories.has(cat as never), `missing category: ${cat}`).toBe(true)
    }
  })

  it('every trigger entry has only void inputs; every non-trigger has at least one non-void input', () => {
    for (const entry of WORKFLOW_NODE_CATALOG) {
      if (entry.category === 'trigger') {
        // Triggers use a single void sentinel input — no real upstream edge required
        expect(entry.inputs.every((i) => i.type === 'void'), `${entry.type} trigger has non-void inputs`).toBe(true)
      } else {
        expect(entry.inputs.length, `${entry.type} has no inputs`).toBeGreaterThan(0)
      }
    }
  })

  it('every entry has at least one output', () => {
    for (const entry of WORKFLOW_NODE_CATALOG) {
      expect(entry.outputs.length, `${entry.type} has no outputs`).toBeGreaterThan(0)
    }
  })

  it('every entry has a concrete exampleConfig', () => {
    for (const entry of WORKFLOW_NODE_CATALOG) {
      expect(entry.exampleConfig.config, `${entry.type} missing exampleConfig.config`).toBeTruthy()
      expect(entry.exampleConfig.expectedInput, `${entry.type} missing exampleConfig.expectedInput`).toBeTruthy()
      expect(entry.exampleConfig.expectedOutput, `${entry.type} missing exampleConfig.expectedOutput`).toBeTruthy()
      expect(
        entry.exampleConfig.downstreamConnection.nodeType,
        `${entry.type} missing exampleConfig.downstreamConnection.nodeType`
      ).toBeTruthy()
    }
  })
})
