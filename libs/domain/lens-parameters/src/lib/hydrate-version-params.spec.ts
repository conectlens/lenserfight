import { describe, expect, it } from 'vitest'

import { hydrateVersionParams } from './hydrate-version-params'

describe('hydrateVersionParams', () => {
  it('maps RPC rows with nested tool and optional', () => {
    const rows = [
      {
        id: 'vp-1',
        version_id: 'v-1',
        label: 'count',
        tool_id: 't-1',
        optional: true,
        tool: {
          id: 't-1',
          key: 'count',
          type: 'integer',
          required: true,
          category: 'input',
          min_length: 0,
          max_length: 100,
          sort_order: 1,
          is_system: false,
        },
      },
    ]
    const params = hydrateVersionParams(rows)
    expect(params[0].label).toBe('count')
    expect(params[0].optional).toBe(true)
    expect(params[0].tool.type).toBe('integer')
  })
})
