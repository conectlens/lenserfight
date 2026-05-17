// Scheduler — unit tests for pure wave-computation over workflow DAGs.
import { describe, it, expect } from 'vitest'
import { Scheduler } from './scheduler'
import type { SchedulerNode, SchedulerEdge } from './scheduler'

// ── Helpers ──────────────────────────────────────────────────────────────────

function nodes(...ids: string[]): SchedulerNode[] {
  return ids.map((id) => ({ id }))
}

function edge(source: string, target: string): SchedulerEdge {
  return { sourceNodeId: source, targetNodeId: target }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Scheduler', () => {
  describe('firstWave', () => {
    it('returns root nodes (in-degree 0) for a linear chain', () => {
      // A → B → C
      const s = new Scheduler(nodes('A', 'B', 'C'), [edge('A', 'B'), edge('B', 'C')])
      expect(s.firstWave()).toEqual(['A'])
    })

    it('returns multiple roots for a wide-fan graph', () => {
      // A, B, C all feed into D
      const s = new Scheduler(
        nodes('A', 'B', 'C', 'D'),
        [edge('A', 'D'), edge('B', 'D'), edge('C', 'D')],
      )
      expect(s.firstWave().sort()).toEqual(['A', 'B', 'C'])
    })

    it('returns single node for a single-node graph', () => {
      const s = new Scheduler(nodes('X'), [])
      expect(s.firstWave()).toEqual(['X'])
    })

    it('returns empty array for an empty graph', () => {
      const s = new Scheduler([], [])
      expect(s.firstWave()).toEqual([])
    })

    it('returns all nodes when there are no edges (disconnected)', () => {
      const s = new Scheduler(nodes('A', 'B', 'C'), [])
      expect(s.firstWave().sort()).toEqual(['A', 'B', 'C'])
    })
  })

  describe('advance', () => {
    it('returns next wave after completing a linear chain step', () => {
      // A → B → C → D
      const s = new Scheduler(
        nodes('A', 'B', 'C', 'D'),
        [edge('A', 'B'), edge('B', 'C'), edge('C', 'D')],
      )
      const wave0 = s.firstWave()
      expect(wave0).toEqual(['A'])

      const wave1 = s.advance(wave0)
      expect(wave1).toEqual(['B'])

      const wave2 = s.advance(wave1)
      expect(wave2).toEqual(['C'])

      const wave3 = s.advance(wave2)
      expect(wave3).toEqual(['D'])

      const wave4 = s.advance(wave3)
      expect(wave4).toEqual([])
    })

    it('handles diamond merge — C released only after both A and B complete', () => {
      // A → C, B → C
      const s = new Scheduler(
        nodes('A', 'B', 'C'),
        [edge('A', 'C'), edge('B', 'C')],
      )
      const wave0 = s.firstWave()
      expect(wave0.sort()).toEqual(['A', 'B'])

      // Complete only A — C not ready yet (still waiting on B)
      const afterA = s.advance(['A'])
      expect(afterA).toEqual([])

      // Complete B — now C is released
      const afterB = s.advance(['B'])
      expect(afterB).toEqual(['C'])
    })

    it('handles fan-out — A feeds B, C, D', () => {
      const s = new Scheduler(
        nodes('A', 'B', 'C', 'D'),
        [edge('A', 'B'), edge('A', 'C'), edge('A', 'D')],
      )
      const wave0 = s.firstWave()
      expect(wave0).toEqual(['A'])

      const wave1 = s.advance(wave0)
      expect(wave1.sort()).toEqual(['B', 'C', 'D'])
    })

    it('handles complex diamond with fan-out and fan-in', () => {
      // A → B, A → C, B → D, C → D
      const s = new Scheduler(
        nodes('A', 'B', 'C', 'D'),
        [edge('A', 'B'), edge('A', 'C'), edge('B', 'D'), edge('C', 'D')],
      )
      expect(s.firstWave()).toEqual(['A'])

      const wave1 = s.advance(['A'])
      expect(wave1.sort()).toEqual(['B', 'C'])

      // Both B and C must complete before D
      const afterB = s.advance(['B'])
      expect(afterB).toEqual([])

      const afterC = s.advance(['C'])
      expect(afterC).toEqual(['D'])
    })
  })

  describe('currentWave', () => {
    it('starts at 0', () => {
      const s = new Scheduler(nodes('A'), [])
      expect(s.currentWave).toBe(0)
    })

    it('increments on each advance call', () => {
      const s = new Scheduler(nodes('A', 'B'), [edge('A', 'B')])
      s.firstWave()
      expect(s.currentWave).toBe(0)

      s.advance(['A'])
      expect(s.currentWave).toBe(1)

      s.advance(['B'])
      expect(s.currentWave).toBe(2)
    })
  })

  describe('parentsOf', () => {
    it('returns parent node ids for a given node', () => {
      const edges = [edge('A', 'C'), edge('B', 'C'), edge('C', 'D')]
      const s = new Scheduler(nodes('A', 'B', 'C', 'D'), edges)

      expect(s.parentsOf('C', edges).sort()).toEqual(['A', 'B'])
      expect(s.parentsOf('D', edges)).toEqual(['C'])
      expect(s.parentsOf('A', edges)).toEqual([])
    })

    it('returns empty array for root node', () => {
      const edges = [edge('A', 'B')]
      const s = new Scheduler(nodes('A', 'B'), edges)
      expect(s.parentsOf('A', edges)).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('ignores edges referencing nodes not in the node list', () => {
      // Edge targets Z which is not in node list — should not crash
      const s = new Scheduler(nodes('A', 'B'), [edge('A', 'B'), edge('A', 'Z')])
      expect(s.firstWave()).toEqual(['A'])
      // Z was never tracked so only B becomes available
      const wave1 = s.advance(['A'])
      expect(wave1).toEqual(['B'])
    })

    it('handles duplicate edges gracefully', () => {
      // Two edges from A to B — B should need both to decrement
      const s = new Scheduler(nodes('A', 'B'), [edge('A', 'B'), edge('A', 'B')])
      expect(s.firstWave()).toEqual(['A'])
      // B has in-degree 2, advancing A decrements by 2 (both edges)
      const wave1 = s.advance(['A'])
      expect(wave1).toEqual(['B'])
    })
  })
})
