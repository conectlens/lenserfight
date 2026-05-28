import { McpServerConfig } from '../config.js';

export function buildDiscoveryDocument(cfg: McpServerConfig): Record<string, unknown> {
  const base = new URL(cfg.supabaseUrl);
  const issuer = `${base.origin}/auth/v1`;

  return {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    userinfo_endpoint: `${issuer}/user`,
    jwks_uri: `${issuer}/jwks`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: ['openid', 'email', 'profile'],
    token_endpoint_auth_methods_supported: ['none'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256'],
  };
}
