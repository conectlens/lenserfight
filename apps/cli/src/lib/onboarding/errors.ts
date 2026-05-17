export type OnboardingErrorCode =
  | 'AUTH_NOT_CONFIGURED'
  | 'API_UNREACHABLE'
  | 'CONFIG_MISSING'
  | 'NODE_VERSION_UNSUPPORTED'
  | 'DOCKER_NOT_RUNNING'
  | 'SUPABASE_CLI_MISSING'
  | 'WORKSPACE_INVALID'
  | 'PROFILE_INCOMPLETE'
  | 'OLLAMA_UNREACHABLE'
  | 'TOKEN_EXPIRED'
  | 'JOURNEY_RPC_UNAVAILABLE'

/**
 * Map doctor check IDs to typed error codes for structured JSON output.
 * Only includes checks that can fail — passing checks don't need a code.
 */
export const CHECK_ID_TO_CODE: Record<string, OnboardingErrorCode | undefined> = {
  auth: 'AUTH_NOT_CONFIGURED',
  cloud_api: 'API_UNREACHABLE',
  node: 'NODE_VERSION_UNSUPPORTED',
  supabase_cli: 'SUPABASE_CLI_MISSING',
  docker: 'DOCKER_NOT_RUNNING',
  project_config: 'CONFIG_MISSING',
  ollama: 'OLLAMA_UNREACHABLE',
  journey_state: 'JOURNEY_RPC_UNAVAILABLE',
  byok_openai: undefined,
  byok_anthropic: undefined,
  byok_google: undefined,
  byok_mistral: undefined,
}

export class OnboardingError extends Error {
  constructor(
    public readonly code: OnboardingErrorCode,
    message: string,
    public readonly hint?: string,
  ) {
    super(message)
    this.name = 'OnboardingError'
  }
}
