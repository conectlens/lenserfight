/**
 * Classification levels for the namespace governance registry.
 *
 * Higher classes carry a higher default deny_score and require progressively
 * stronger verification to claim. The ordering is monotonic — when multiple
 * probes fire, the highest class wins.
 *
 * Matches the CHECK constraint in identity_gov.reserved_namespaces.
 */
export const NAMESPACE_CLASSES = [
  'system',
  'security',
  'provider',
  'model',
  'future',
  'verified_only',
  'restricted',
  'public',
] as const

export type NamespaceClass = (typeof NAMESPACE_CLASSES)[number]

/** Default deny_score per class (mirrors identity_gov seed data). */
export const NAMESPACE_CLASS_DENY_SCORE: Record<
  Exclude<NamespaceClass, 'public'>,
  number
> = {
  system:       100,
  security:      95,
  provider:      90,
  model:         85,
  future:        80,
  verified_only: 70,
  restricted:    50,
}

export type EntryKind = 'exact' | 'prefix' | 'suffix' | 'token' | 'regex'
export type EntrySource = 'canonical' | 'manifest' | 'ai_inferred'

export type ValidationVerdict = 'allow' | 'deny' | 'escalate'
