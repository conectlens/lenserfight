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
 * A locally stored API key — encrypted with AES-GCM in IndexedDB.
 * The raw key is NEVER stored in React state; only decrypted transiently at execution time.
 */
export interface LocalKey {
  id: string
  provider: string
  label: string
  encryptedKey: ArrayBuffer
  iv: Uint8Array
  createdAt: string
}

/** Safe subset of LocalKey for React state — no ciphertext or IV */
export interface LocalKeyMeta {
  id: string
  provider: string
  label: string
  createdAt: string
}
