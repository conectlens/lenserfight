// ─── BYOKKeyResolver ──────────────────────────────────────────────────────────
// GRASP Information Expert: owns all knowledge about how to resolve a BYOK key.
// Callers never inspect where the key came from.
//
// Security rules (NEVER violated):
//   1. Keys are NEVER stored in the database (only byok_key_ref_id is stored)
//   2. Keys NEVER appear in input_snapshot, logs, or error messages
//   3. Keys are resolved transiently at execution time only
//   4. Platform BYOK path: key stored encrypted in vault, referenced by ID only

export interface BYOKKeyResolverOptions {
  /** Highest priority: value passed via --key CLI flag or programmatic override. */
  cliFlag?: string;
  /** Environment variable name to check, e.g. 'OPENAI_API_KEY'. */
  envVar?: string;
  /** Optional prefix for auto-deriving envVar from provider name. Defaults to '<PROVIDER>_API_KEY'. */
  envPrefix?: string;
}

const PROVIDER_ENV_MAP: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_AI_API_KEY',
  mistral:  'MISTRAL_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  ollama: '', // Ollama: no key needed
};

export class BYOKKeyResolver {
  /**
   * Resolves an API key for the given provider.
   * Resolution order: cliFlag > envVar > derived env var.
   * Throws if no key is found and the provider requires one.
   */
  resolve(provider: string, options: BYOKKeyResolverOptions = {}): string {
    // Ollama is local; no key required
    if (provider === 'ollama') return '';

    if (options.cliFlag) return options.cliFlag;

    const envVarName = options.envVar ?? PROVIDER_ENV_MAP[provider];
    if (envVarName) {
      const value = typeof process !== 'undefined' ? process.env[envVarName] : undefined;
      if (value) return value;
    }

    throw new Error(
      `No API key found for provider '${provider}'. ` +
        `Set the ${envVarName ?? `${provider.toUpperCase()}_API_KEY`} environment variable or pass --key <value>.`
    );
  }

  /**
   * Returns true if a key is available without throwing.
   * Safe to use for capability checks before execution.
   */
  has(provider: string, options: BYOKKeyResolverOptions = {}): boolean {
    if (provider === 'ollama') return true;
    try {
      this.resolve(provider, options);
      return true;
    } catch {
      return false;
    }
  }
}

export const byokKeyResolver = new BYOKKeyResolver();
