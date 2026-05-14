import type { LensContractBody } from './lens-contract.types'
import type { ParameterContract } from './parameter-contract.types'

export type SemverBump = 'none' | 'patch' | 'minor' | 'major'

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-[a-z0-9]+(?:\.\d+)?)?$/

export interface ParsedSemver {
  major: number
  minor: number
  patch: number
  prerelease?: string
}

export function parseSemver(input: string): ParsedSemver {
  const m = SEMVER_PATTERN.exec(input)
  if (!m) {
    throw new Error(`invalid semver: ${input}`)
  }
  const prerelease = input.includes('-')
    ? input.slice(input.indexOf('-') + 1)
    : undefined
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease,
  }
}

/**
 * Compares the minimum semver bump required to go from `prior` to `next`.
 *
 * Rules (per LG architecture §9):
 *  - Adding an optional param         → minor
 *  - Adding a required param w/ default→ minor
 *  - Adding a required param no default→ major
 *  - Removing a param                  → major
 *  - Renaming a param                  → major (manifests as remove + add)
 *  - Tightening validation             → major
 *  - Loosening validation              → minor
 *  - classification public→protected   → major
 *  - Adding output field               → minor
 *  - Removing output field             → major
 *  - Body changes with no shape change → patch
 *  - Identical bodies                  → none
 */
export function requiredSemverBump(
  prior: LensContractBody,
  next: LensContractBody,
): SemverBump {
  const priorParams = byLabel(prior.inputs)
  const nextParams = byLabel(next.inputs)

  let bump: SemverBump = 'none'

  for (const [label, priorParam] of priorParams) {
    const nextParam = nextParams.get(label)
    if (!nextParam) {
      return 'major' // removal
    }
    const paramBump = paramDiff(priorParam, nextParam)
    bump = maxBump(bump, paramBump)
    if (bump === 'major') return 'major'
  }

  for (const [label, nextParam] of nextParams) {
    if (priorParams.has(label)) continue
    const hasUsableDefault =
      nextParam.default != null && nextParam.default.kind !== 'late_bound'
    if (nextParam.required && !hasUsableDefault) {
      return 'major'
    }
    bump = maxBump(bump, 'minor')
  }

  const priorOutputs = new Set(
    prior.outputs.map((o) => `${o.kind}:${o.artifactKind}`),
  )
  const nextOutputs = new Set(
    next.outputs.map((o) => `${o.kind}:${o.artifactKind}`),
  )
  for (const o of priorOutputs) {
    if (!nextOutputs.has(o)) return 'major'
  }
  for (const o of nextOutputs) {
    if (!priorOutputs.has(o)) {
      bump = maxBump(bump, 'minor')
    }
  }

  if (bump === 'none' && prior.name !== next.name) bump = 'patch'
  if (bump === 'none' && prior.summary !== next.summary) bump = 'patch'

  return bump
}

function paramDiff(prior: ParameterContract, next: ParameterContract): SemverBump {
  if (prior.classification !== next.classification) {
    const order = ['public', 'internal', 'protected', 'system'] as const
    const prev = order.indexOf(prior.classification)
    const now = order.indexOf(next.classification)
    if (now > prev) return 'major'
  }
  if (prior.type !== next.type) return 'major'
  if (prior.required !== next.required) {
    return next.required && (next.default == null || next.default.kind === 'late_bound')
      ? 'major'
      : 'minor'
  }
  const tightened = validationTightened(prior.validation, next.validation)
  if (tightened === 'tighter') return 'major'
  if (tightened === 'looser')  return 'minor'
  return 'none'
}

type TighteningResult = 'same' | 'tighter' | 'looser'

function validationTightened(
  a: ParameterContract['validation'],
  b: ParameterContract['validation'],
): TighteningResult {
  if (!a && !b) return 'same'
  if (!a) return 'tighter'
  if (!b) return 'looser'

  let tighter = false
  let looser = false

  if (a.minLength !== b.minLength) {
    const av = a.minLength ?? 0
    const bv = b.minLength ?? 0
    if (bv > av) tighter = true
    else if (bv < av) looser = true
  }
  if (a.maxLength !== b.maxLength) {
    const av = a.maxLength ?? Number.POSITIVE_INFINITY
    const bv = b.maxLength ?? Number.POSITIVE_INFINITY
    if (bv < av) tighter = true
    else if (bv > av) looser = true
  }
  if (a.min !== b.min) {
    const av = a.min ?? Number.NEGATIVE_INFINITY
    const bv = b.min ?? Number.NEGATIVE_INFINITY
    if (bv > av) tighter = true
    else if (bv < av) looser = true
  }
  if (a.max !== b.max) {
    const av = a.max ?? Number.POSITIVE_INFINITY
    const bv = b.max ?? Number.POSITIVE_INFINITY
    if (bv < av) tighter = true
    else if (bv > av) looser = true
  }
  const aEnum = a.enum ? new Set(a.enum) : null
  const bEnum = b.enum ? new Set(b.enum) : null
  if (aEnum && bEnum) {
    for (const v of aEnum) if (!bEnum.has(v)) tighter = true
    for (const v of bEnum) if (!aEnum.has(v)) looser = true
  } else if (aEnum && !bEnum) {
    looser = true
  } else if (!aEnum && bEnum) {
    tighter = true
  }

  if (tighter) return 'tighter'
  if (looser) return 'looser'
  return 'same'
}

function byLabel(
  list: ReadonlyArray<ParameterContract>,
): Map<string, ParameterContract> {
  const m = new Map<string, ParameterContract>()
  for (const p of list) m.set(p.label, p)
  return m
}

const RANK: Record<SemverBump, number> = { none: 0, patch: 1, minor: 2, major: 3 }

function maxBump(a: SemverBump, b: SemverBump): SemverBump {
  return RANK[a] >= RANK[b] ? a : b
}

/** Returns true when `declared` >= `required` bump given the prior version. */
export function isSufficientBump(
  priorSemver: string,
  declaredSemver: string,
  required: SemverBump,
): boolean {
  if (required === 'none') return true
  const a = parseSemver(priorSemver)
  const b = parseSemver(declaredSemver)
  if (b.major > a.major) return true
  if (required === 'major') return false
  if (b.minor > a.minor) return true
  if (required === 'minor') return false
  return b.patch > a.patch
}
