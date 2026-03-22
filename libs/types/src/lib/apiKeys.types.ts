/** Supported BYOK AI providers */
export type ByokProvider = 'openai' | 'anthropic' | 'google' | 'mistral'

/** Provider display labels */
export const BYOK_PROVIDER_LABELS: Record<ByokProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
  mistral: 'Mistral',
}

/** A stored BYOK API key (never contains the full key) */
export interface UserApiKey {
  id: string
  lenserId: string
  provider: ByokProvider
  label: string | null
  /** Last 4 characters of the key, for masked display only */
  keySuffix: string
  isActive: boolean
  createdAt: string
  revokedAt: string | null
}

/** Payload for creating a new BYOK key */
export interface CreateApiKeyDTO {
  provider: ByokProvider
  label?: string
  /** The raw API key — only used in transit to the server RPC, never persisted client-side */
  rawKey: string
}
