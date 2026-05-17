/**
 * LenserFight Spec API Version constants.
 *
 * All public spec documents carry an `apiVersion` field using the same
 * group/version convention as Kubernetes CRDs. This makes spec files
 * unambiguous when mixed in an external registry or CI pipeline.
 *
 * Example frontmatter:
 *   apiVersion: lenserfight.dev/v1alpha1
 *   kind: Lens
 *
 * GRASP: Information Expert — this module is the single source of truth for
 * versioning rules and deprecation state. No other module may define its own
 * version strings.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const LENSERFIGHT_API_GROUP = 'lenserfight.dev' as const

export const SPEC_API_VERSIONS = ['v1alpha1'] as const
export type SpecApiVersion = (typeof SPEC_API_VERSIONS)[number]

export const CURRENT_API_VERSION: `${typeof LENSERFIGHT_API_GROUP}/${SpecApiVersion}` =
  `${LENSERFIGHT_API_GROUP}/v1alpha1`

export const DEPRECATED_API_VERSIONS: readonly string[] = [] as const

export const EXPERIMENTAL_API_VERSIONS: readonly SpecApiVersion[] = [
  'v1alpha1',
] as const

// ─── Parsing ──────────────────────────────────────────────────────────────────

export interface ParsedApiVersion {
  group: string
  version: string
  isRecognized: boolean
  isDeprecated: boolean
  isExperimental: boolean
  isCurrent: boolean
}

/**
 * Parse and classify an `apiVersion` string from a spec document.
 * Returns null when the string is not in `<group>/<version>` form.
 */
export function parseApiVersion(raw: string): ParsedApiVersion | null {
  if (!raw || typeof raw !== 'string') return null
  const slashIdx = raw.indexOf('/')
  if (slashIdx < 1 || slashIdx === raw.length - 1) return null

  const group = raw.slice(0, slashIdx)
  const version = raw.slice(slashIdx + 1)

  const isRecognized =
    group === LENSERFIGHT_API_GROUP &&
    (SPEC_API_VERSIONS as readonly string[]).includes(version)

  return {
    group,
    version,
    isRecognized,
    isDeprecated: DEPRECATED_API_VERSIONS.includes(raw),
    isExperimental: EXPERIMENTAL_API_VERSIONS.includes(version as SpecApiVersion),
    isCurrent: raw === CURRENT_API_VERSION,
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

export type ApiVersionValidationOutcome = 'valid' | 'deprecated' | 'unknown' | 'malformed' | 'missing'

export interface ApiVersionValidationResult {
  outcome: ApiVersionValidationOutcome
  apiVersion?: string
  message: string
}

/**
 * Validate the `apiVersion` field from a spec frontmatter object.
 *
 * Returns `valid` when the value is the current version.
 * Returns `deprecated` when the value is a known-old version with migration path.
 * Returns `unknown` when the group matches but the version is unrecognized.
 * Returns `malformed` when the string is present but not in `group/version` form.
 * Returns `missing` when the field is absent (treated as a warning, not error,
 *   because `schema_version` numeric form is the legacy path).
 */
export function validateApiVersion(apiVersion: unknown): ApiVersionValidationResult {
  if (apiVersion === undefined || apiVersion === null) {
    return {
      outcome: 'missing',
      message:
        'Missing `apiVersion`. Add `apiVersion: lenserfight.dev/v1alpha1` to opt into the versioned spec format, or run `lf spec migrate` to add it automatically.',
    }
  }

  if (typeof apiVersion !== 'string') {
    return {
      outcome: 'malformed',
      apiVersion: String(apiVersion),
      message: '`apiVersion` must be a string in `group/version` form (e.g. lenserfight.dev/v1alpha1).',
    }
  }

  const parsed = parseApiVersion(apiVersion)
  if (!parsed) {
    return {
      outcome: 'malformed',
      apiVersion,
      message: `\`apiVersion\` "${apiVersion}" is not in \`group/version\` form. Expected: lenserfight.dev/v1alpha1.`,
    }
  }

  if (parsed.isDeprecated) {
    return {
      outcome: 'deprecated',
      apiVersion,
      message: `\`apiVersion\` "${apiVersion}" is deprecated. Migrate to ${CURRENT_API_VERSION} using \`lf spec migrate\`.`,
    }
  }

  if (!parsed.isRecognized) {
    return {
      outcome: 'unknown',
      apiVersion,
      message: `\`apiVersion\` "${apiVersion}" is not a recognized LenserFight version. Known versions: ${SPEC_API_VERSIONS.map((v) => `${LENSERFIGHT_API_GROUP}/${v}`).join(', ')}.`,
    }
  }

  return { outcome: 'valid', apiVersion, message: 'apiVersion is valid.' }
}
