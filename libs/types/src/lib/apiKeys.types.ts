/** Cloud BYOK providers (stored in platform vault, key never touches client) */
export type CloudByokProvider = 'openai' | 'anthropic' | 'google' | 'mistral'

/** All BYOK providers — includes Ollama for local-only execution */
export type ByokProvider = CloudByokProvider | 'ollama'

/** Provider display labels */
export const BYOK_PROVIDER_LABELS: Record<ByokProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
  mistral: 'Mistral',
  ollama: 'Ollama (Local)',
}

/** A stored BYOK API key (never contains the full key) */
export interface UserApiKey {
  id: string
  lenserId: string
  providerId: string
  /** Short machine key from ai.providers, e.g. 'openai' */
  providerKey: string
  /** Human-readable name from ai.providers, e.g. 'OpenAI' */
  providerDisplayName: string
  label: string | null
  /** Last 4 characters of the key, for masked display only */
  keySuffix: string
  isActive: boolean
  createdAt: string
  revokedAt: string | null
}

/** Payload for creating a new cloud BYOK key (server-facing, Ollama excluded) */
export interface CreateApiKeyDTO {
  provider: CloudByokProvider
  label?: string
  /** The raw API key — only used in transit to the server RPC, never persisted client-side */
  rawKey: string
}

/**
 * Metadata for a locally stored BYOK key. Local keys live in
 * `~/.lenserfight/keys/` on the user's machine, encrypted at rest with
 * AES-256-GCM, and are accessed from the browser only via the LenserFight
 * Gateway loopback daemon. The ciphertext NEVER touches the browser; only
 * this metadata shape does.
 */
export interface LocalKeyMeta {
  id: string
  provider: string
  label: string
  createdAt: string
}

/** Whether the LenserFight Gateway is reachable for Local Keys. */
export type GatewayPairingStatus =
  | 'available'
  | 'gateway_unreachable'
  | 'gateway_not_paired'
  | 'gateway_forbidden'
