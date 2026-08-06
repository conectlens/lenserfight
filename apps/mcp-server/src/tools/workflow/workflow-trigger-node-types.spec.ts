import { WORKFLOW_NODE_CATALOG } from '@lenserfight/infra/execution/catalog';

import { TRIGGER_NODE_TYPES, TRIGGER_NODE_TYPE_SET } from './workflow-trigger-node-types';

describe('TRIGGER_NODE_TYPES', () => {
  it('matches the catalog trigger category exactly (drift guard)', () => {
    const expected = WORKFLOW_NODE_CATALOG.filter((e) => e.category === 'trigger').map((e) => e.type).sort();
    expect([...TRIGGER_NODE_TYPES].sort()).toEqual(expected);
    expect(expected.length).toBeGreaterThan(0);
  });

  it('the Set view contains the same members as the array', () => {
    for (const type of TRIGGER_NODE_TYPES) {
      expect(TRIGGER_NODE_TYPE_SET.has(type)).toBe(true);
    }
    expect(TRIGGER_NODE_TYPE_SET.size).toBe(TRIGGER_NODE_TYPES.length);
  });
});
