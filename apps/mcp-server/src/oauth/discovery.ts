import { McpServerConfig } from '../config.js';

export function buildDiscoveryDocument(cfg: McpServerConfig): Record<string, unknown> {
  const base = new URL(cfg.supabaseUrl);
  const supabaseIssuer = `${base.origin}/auth/v1`;
  const oauthBase = cfg.mcpOAuthBaseUrl;

  return {
    issuer: oauthBase,
    authorization_endpoint: `${oauthBase}/oauth/authorize`,
    token_endpoint: `${oauthBase}/oauth/token`,
    userinfo_endpoint: `${supabaseIssuer}/user`,
    jwks_uri: `${supabaseIssuer}/jwks`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: ['openid', 'email', 'profile'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256'],
  };
}
