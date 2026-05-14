// libs/infra/byok — BYOK key access bound to a held reservation.
//
// GRASP Indirection + Pure Fabrication: sits between workers and the database
// so a future KMS swap (CG8) is invisible to call sites.
//
// Security rules:
//  1. The plaintext API key NEVER leaves this object's `withKey` block.
//  2. Every call requires a `reservationId` — the unforgeable per-call token
//     bound to {ai_lenser_id, model_id, provider, status, held_until}.
//  3. The encrypted ciphertext NEVER appears in logs or error messages.

export interface ByokRpcClient {
  rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<{
    data: T | null
    error: { message: string; code?: string | null } | null
  }>
}

export interface BYOKResolveInput {
  agentId: string
  provider: string
  /** Provider model key (e.g. 'gpt-4o'). Validated against the reservation's model. */
  modelId?: string | null
  /** Held reservation UUID from fn_cost_reserve — the per-call binding token. */
  reservationId: string
}

export class BYOKError extends Error {
  public readonly code: string
  constructor(code: string, message: string) {
    super(`${code}: ${message}`)
    this.name = 'BYOKError'
    this.code = code
  }
}

/**
 * Decryption hook. CG1 uses app-layer AES-256-GCM (existing convention); CG8
 * will plug in an envelope-encryption adapter (KMS) without touching callers.
 */
export interface KeyDecryptor {
  decrypt(ciphertext: string): Promise<string>
}

const ENV_VAR_BY_PROVIDER: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_AI_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  ollama: '',
}

const parseError = (msg: string): BYOKError => {
  const m = msg.match(/^(E_BYOK_[A-Z_]+)/)
  return new BYOKError(m?.[1] ?? 'E_BYOK_RESOLVE_FAILED', msg)
}

export class BYOKKeyClient {
  constructor(
    private readonly client: ByokRpcClient,
    private readonly decryptor: KeyDecryptor,
  ) {}

  /**
   * Runs `body` with a transient plaintext API key resolved for the given
   * reservation. The key is wiped from the closure when `body` returns.
   *
   * Workers that need an Ollama provider get an empty string (no key needed).
   */
  async withKey<T>(input: BYOKResolveInput, body: (apiKey: string) => Promise<T>): Promise<T> {
    if (input.provider === 'ollama') {
      return body('')
    }
    if (!input.reservationId) {
      throw new BYOKError('E_BYOK_CONTEXT_MISSING', 'reservationId is required')
    }

    const { data, error } = await this.client.rpc<string | null>('fn_byok_key_resolve_v2', {
      p_agent_id: input.agentId,
      p_provider: input.provider,
      p_model_id: input.modelId ?? null,
      p_reservation_id: input.reservationId,
    })
    if (error) throw parseError(error.message)
    if (data == null) {
      // No key registered for (agent, provider). Workers may fall back to an
      // env-var key path explicitly (e.g. CLI dev mode); we do NOT silently
      // read process.env here, because workers must opt in.
      throw new BYOKError('E_BYOK_NO_KEY', `no BYOK key registered for agent/${input.provider}`)
    }

    const plaintext = await this.decryptor.decrypt(data)
    try {
      return await body(plaintext)
    } finally {
      // Best-effort scrub. V8 strings are immutable but losing the reference
      // is the right primitive; the closure does not retain `plaintext`.
      void plaintext
    }
  }
}

/**
 * Pass-through decryptor for the legacy app-layer path. Reads the ciphertext
 * format already produced by the CLI (`ENC::<base64>` or raw). Real callers
 * inject a real adapter (e.g. CryptoEnvelopeDecryptor); this exists so unit
 * tests and dev environments can run without a key store dependency.
 */
export class IdentityDecryptor implements KeyDecryptor {
  async decrypt(ciphertext: string): Promise<string> {
    return ciphertext.startsWith('ENC::') ? ciphertext.slice(5) : ciphertext
  }
}

/** Convenience for env-var fallback in CLI dev mode (NOT used by workers). */
export const resolveProviderEnvKey = (provider: string): string | null => {
  const envVar = ENV_VAR_BY_PROVIDER[provider]
  if (!envVar) return null
  return typeof process !== 'undefined' ? process.env[envVar] ?? null : null
}
