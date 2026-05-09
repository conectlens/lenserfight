/**
 * Conflict resolver for conflict-aware object classes.
 *
 * Default policy: last-writer-wins per field with vector clock tiebreak.
 *
 * Each entry has a vector clock keyed by device id (`{ devA: 3, devB: 5 }`).
 * Two entries A and B compare as:
 *   - A causally precedes B → use B
 *   - B causally precedes A → use A
 *   - concurrent (no causal order) → tiebreak: highest sum of clock values,
 *     then lexicographic device id.
 *
 * The output of `mergeEntries` is the entry that should be written back to the
 * cloud. When the result is `'conflict'`, the daemon emits a conflict row that
 * `lf gateway sync status --conflicts` exposes.
 */

export interface VClockEntry<TPayload = Record<string, unknown>> {
  device_id: string
  payload: TPayload
  vclock: Record<string, number>
}

export type MergeOutcome<TPayload> =
  | { kind: 'use'; entry: VClockEntry<TPayload> }
  | { kind: 'conflict'; left: VClockEntry<TPayload>; right: VClockEntry<TPayload> }

export function compareVectorClocks(
  a: Record<string, number>,
  b: Record<string, number>
): 'before' | 'after' | 'equal' | 'concurrent' {
  let aLessOrEqual = true
  let bLessOrEqual = true
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) {
    const av = a[k] ?? 0
    const bv = b[k] ?? 0
    if (av > bv) aLessOrEqual = false
    if (bv > av) bLessOrEqual = false
  }
  if (aLessOrEqual && bLessOrEqual) return 'equal'
  if (aLessOrEqual) return 'before'
  if (bLessOrEqual) return 'after'
  return 'concurrent'
}

export function mergeEntries<TPayload extends Record<string, unknown>>(
  left: VClockEntry<TPayload>,
  right: VClockEntry<TPayload>
): MergeOutcome<TPayload> {
  const cmp = compareVectorClocks(left.vclock, right.vclock)
  if (cmp === 'before') return { kind: 'use', entry: right }
  if (cmp === 'after' || cmp === 'equal') return { kind: 'use', entry: left }

  // Concurrent — try LWW per field tiebreak.
  const lSum = sumClock(left.vclock)
  const rSum = sumClock(right.vclock)
  if (lSum > rSum) return { kind: 'use', entry: left }
  if (rSum > lSum) return { kind: 'use', entry: right }
  if (left.device_id < right.device_id) return { kind: 'use', entry: left }
  if (left.device_id > right.device_id) return { kind: 'use', entry: right }

  // Identical clocks AND identical device id — definitely a conflict.
  return { kind: 'conflict', left, right }
}

function sumClock(c: Record<string, number>): number {
  let s = 0
  for (const v of Object.values(c)) s += v
  return s
}

/**
 * Increment this device's component of the vector clock.
 */
export function incrementVClock(
  clock: Record<string, number>,
  deviceId: string
): Record<string, number> {
  return { ...clock, [deviceId]: (clock[deviceId] ?? 0) + 1 }
}
