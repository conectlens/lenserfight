import { describe, expect, it } from 'vitest'

import {
  compareVectorClocks,
  incrementVClock,
  mergeEntries,
} from './conflict-resolver'

describe('compareVectorClocks', () => {
  it('detects equal', () => {
    expect(compareVectorClocks({ a: 1 }, { a: 1 })).toBe('equal')
  })
  it('detects before', () => {
    expect(compareVectorClocks({ a: 1 }, { a: 2 })).toBe('before')
  })
  it('detects after', () => {
    expect(compareVectorClocks({ a: 3, b: 1 }, { a: 1, b: 1 })).toBe('after')
  })
  it('detects concurrent', () => {
    expect(compareVectorClocks({ a: 1 }, { b: 1 })).toBe('concurrent')
  })
})

describe('mergeEntries', () => {
  it('uses the later entry when one happens-before', () => {
    const result = mergeEntries(
      { device_id: 'a', payload: { x: 1 }, vclock: { a: 1 } },
      { device_id: 'b', payload: { x: 2 }, vclock: { a: 1, b: 1 } }
    )
    expect(result.kind).toBe('use')
    if (result.kind === 'use') expect(result.entry.device_id).toBe('b')
  })

  it('breaks concurrent ties by sum of clock values', () => {
    const result = mergeEntries(
      { device_id: 'a', payload: { x: 1 }, vclock: { a: 5 } },
      { device_id: 'b', payload: { x: 2 }, vclock: { b: 1 } }
    )
    expect(result.kind).toBe('use')
    if (result.kind === 'use') expect(result.entry.device_id).toBe('a')
  })
})

describe('incrementVClock', () => {
  it('increments the device entry', () => {
    expect(incrementVClock({}, 'a')).toEqual({ a: 1 })
    expect(incrementVClock({ a: 5 }, 'a')).toEqual({ a: 6 })
    expect(incrementVClock({ a: 5 }, 'b')).toEqual({ a: 5, b: 1 })
  })
})
