import type { WorkflowNodeRecord } from '@lenserfight/data/repositories'
import { describe, expect, it } from 'vitest'

import { diffNodes } from './WorkflowVersionDiff'

function node(overrides: Partial<WorkflowNodeRecord> & Pick<WorkflowNodeRecord, 'id'>): WorkflowNodeRecord {
  return {
    workflow_id: 'wf-1',
    lens_id: 'lens-1',
    position_x: 0,
    position_y: 0,
    ordinal: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('diffNodes', () => {
  it('detects added nodes', () => {
    const result = diffNodes([], [node({ id: 'n1' })])
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'n1', kind: 'added' })
  })

  it('detects removed nodes', () => {
    const result = diffNodes([node({ id: 'n1' })], [])
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'n1', kind: 'removed' })
  })

  it('marks identical nodes as unchanged', () => {
    const a = node({ id: 'n1', position_x: 10, position_y: 20, config: { foo: 'bar' } })
    const b = node({ id: 'n1', position_x: 10, position_y: 20, config: { foo: 'bar' } })
    const result = diffNodes([a], [b])
    expect(result[0].kind).toBe('unchanged')
  })

  it('flags position changes as modified', () => {
    const a = node({ id: 'n1', position_x: 0 })
    const b = node({ id: 'n1', position_x: 100 })
    const result = diffNodes([a], [b])
    expect(result[0].kind).toBe('modified')
    expect(result[0].changedFields).toContain('position')
  })

  it('flags config changes as modified', () => {
    const a = node({ id: 'n1', config: { x: 1 } })
    const b = node({ id: 'n1', config: { x: 2 } })
    const result = diffNodes([a], [b])
    expect(result[0].kind).toBe('modified')
    expect(result[0].changedFields).toContain('config')
  })

  it('flags lens_id and label changes', () => {
    const a = node({ id: 'n1', lens_id: 'lens-a', label: 'A' })
    const b = node({ id: 'n1', lens_id: 'lens-b', label: 'B' })
    const result = diffNodes([a], [b])
    expect(result[0].changedFields).toEqual(expect.arrayContaining(['lens_id', 'label']))
  })

  it('handles mixed add/remove/modify in one diff', () => {
    const a = [
      node({ id: 'keep', position_x: 0 }),
      node({ id: 'modify', position_x: 0 }),
      node({ id: 'remove' }),
    ]
    const b = [
      node({ id: 'keep', position_x: 0 }),
      node({ id: 'modify', position_x: 50 }),
      node({ id: 'add' }),
    ]
    const result = diffNodes(a, b)
    const byId = Object.fromEntries(result.map((r) => [r.id, r.kind]))
    expect(byId).toEqual({ keep: 'unchanged', modify: 'modified', remove: 'removed', add: 'added' })
  })
})
