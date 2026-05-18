/**
 * Google OAuth provider definition.
 *
 * Capabilities: gmail, drive, sheets, docs, calendar.
 * Auth strategy: OAuth 2.0 with offline access (refresh token).
 *
 * The buildAuthUrl function constructs the Google OAuth 2.0 authorization URL.
 * It uses access_type=offline and prompt=consent to ensure a refresh token
 * is always returned (required for long-lived connections).
 *
 * Env vars required at runtime:
 *   GOOGLE_OAUTH_CLIENT_ID — Google Cloud OAuth 2.0 client ID
 */

import type { OAuthCapabilityDefinition, OAuthProviderDefinition } from '../oauth-connection.types'

const GOOGLE_OAUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth'

export const GOOGLE_CAPABILITIES: readonly OAuthCapabilityDefinition[] = [
  {
    capability: 'gmail',
    provider: 'google',
    requiredScopes: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
    ],
    displayName: 'Gmail',
    description: 'Send and read Gmail messages on your behalf',
    supportedOperations: ['send', 'read', 'list'],
  },
  {
    capability: 'drive',
    provider: 'google',
    requiredScopes: [
      'https://www.googleapis.com/auth/drive.file',
    ],
    displayName: 'Google Drive',
    description: 'Read and write files in Google Drive',
    supportedOperations: ['read', 'write', 'list', 'create'],
  },
  {
    capability: 'sheets',
    provider: 'google',
    requiredScopes: [
      'https://www.googleapis.com/auth/spreadsheets',
    ],
    displayName: 'Google Sheets',
    description: 'Read and write Google Sheets data',
    supportedOperations: ['read_range', 'append_row', 'update_range'],
    operations: [
      {
        operation: 'read_range',
        displayName: 'Read range',
        description: 'Read a Google Sheets range.',
        availability: 'experimental',
        requiredScopes: ['https://www.googleapis.com/auth/spreadsheets'],
        outputShape: 'array',
      },
      {
        operation: 'append_row',
        displayName: 'Append row',
        description: 'Append data to a Google Sheets range.',
        availability: 'experimental',
        requiredScopes: ['https://www.googleapis.com/auth/spreadsheets'],
        outputShape: 'status',
      },
      {
        operation: 'update_range',
        displayName: 'Update range',
        description: 'Update a Google Sheets range.',
        availability: 'experimental',
        requiredScopes: ['https://www.googleapis.com/auth/spreadsheets'],
        outputShape: 'status',
      },
    ],
  },
  {
    capability: 'docs',
    provider: 'google',
    requiredScopes: [
      'https://www.googleapis.com/auth/documents',
    ],
    displayName: 'Google Docs',
    description: 'Read and write Google Docs',
    supportedOperations: ['read', 'write'],
  },
  {
    capability: 'calendar',
    provider: 'google',
    requiredScopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    displayName: 'Google Calendar',
    description: 'Create and manage Google Calendar events',
    supportedOperations: ['create_event', 'read', 'update', 'delete'],
    operations: [
      {
        operation: 'create_event',
        displayName: 'Create event',
        description: 'Create a Google Calendar event.',
        availability: 'experimental',
        requiredScopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events',
        ],
        outputShape: 'object',
      },
    ],
  },
]

export const googleProvider: OAuthProviderDefinition = {
  provider: 'google',
  displayName: 'Google',
  description: 'Google Workspace services including Gmail, Drive, Docs, Sheets, and Calendar.',
  authStrategy: 'oauth2',
  capabilities: GOOGLE_CAPABILITIES,
  availability: 'available',
  revocationBehavior: 'Revoke the stored user connection and stop resolving access tokens.',
  tokenRefreshBehavior: 'Refresh OAuth access tokens with the stored refresh token before expiry.',
  secretStorageRequirements: 'Store access and refresh tokens in Supabase Vault; expose metadata only.',
  rateLimit: {
    requestsPerMinute: 60,
    providerPolicyUrl: 'https://developers.google.com/sheets/api/limits',
  },
  executionSafety: {
    serverSideOnly: true,
    allowAiPromptUseByDefault: false,
    masksSecretsInLogs: true,
  },
  docs: {
    docsSlug: 'google',
    examples: ['Google Sheets row to workflow generation node'],
  },
  ui: {
    category: 'productivity',
    availability: 'available',
    connectLabel: 'Connect Google',
  },
  testFixtures: {
    fixtureKind: 'mock_adapter',
    notes: 'Use deterministic Google Sheets and Calendar adapter fixtures; no live API calls in normal tests.',
  },

  buildAuthUrl(capability, redirectUri, state) {
    const capDef = GOOGLE_CAPABILITIES.find((c) => c.capability === capability)
    if (!capDef) {
      throw new Error(`Unknown Google capability: ${capability}`)
    }

    // GOOGLE_OAUTH_CLIENT_ID must be set in the environment
    const clientId =
      typeof process !== 'undefined'
        ? (process.env?.['GOOGLE_OAUTH_CLIENT_ID'] ?? '')
        : ''

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: capDef.requiredScopes.join(' '),
      // offline: ensures refresh_token is returned
      access_type: 'offline',
      // consent: forces the consent screen even if previously granted,
      // which guarantees a fresh refresh_token is issued
      prompt: 'consent',
      state,
    })

    return `${GOOGLE_OAUTH_BASE}?${params.toString()}`
  },
}
