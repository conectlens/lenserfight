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
    supportedOperations: ['read', 'write', 'create'],
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
    supportedOperations: ['read', 'create', 'update', 'delete'],
  },
]

export const googleProvider: OAuthProviderDefinition = {
  provider: 'google',
  displayName: 'Google',
  capabilities: GOOGLE_CAPABILITIES,

  buildAuthUrl(capability, redirectUri, state) {
    const capDef = GOOGLE_CAPABILITIES.find((c) => c.capability === capability)
    if (!capDef) {
      throw new Error(`Unknown Google capability: ${capability}`)
    }

    // GOOGLE_OAUTH_CLIENT_ID must be set in the environment
    const clientId =
      (typeof process !== 'undefined' && process.env?.['GOOGLE_OAUTH_CLIENT_ID']) ?? ''

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
