export const LENS_GOVERNANCE_SPEC_VERSION = '1.0.0'

export const MAX_LENS_DEPENDENCY_DEPTH = 16
export const MAX_PARAMETERS_PER_CONTRACT = 256
export const MAX_CAPABILITY_SUMMARY_LENGTH = 300
export const CONTENT_HASH_BYTE_LENGTH = 32

export const LENS_CONTRACT_KINDS = ['lens', 'workflow', 'composite'] as const
export const PARAMETER_CLASSIFICATIONS = [
  'public',
  'internal',
  'protected',
  'system',
] as const
export const PARAMETER_KINDS = ['primitive', 'ai', 'runtime'] as const
export const PARAMETER_SCOPES = [
  'lens',
  'workflow',
  'run',
  'tenant',
  'global',
] as const
export const DEPENDENCY_BINDINGS = ['lift', 'bind', 'ref'] as const
export const CONTRACT_CHANNELS = [
  'stable',
  'beta',
  'canary',
  'deprecated',
  'yanked',
] as const
export const SIGNATURE_ALGORITHMS = ['ed25519', 'hmac-sha256'] as const

export const LENS_KINDS = [
  'text',
  'image',
  'video',
  'audio',
  'music',
  'research',
  'pdf',
  'transform',
  'orchestration',
  'validation',
  'routing',
] as const
