import { createHash, createHmac, randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  CHAINABIT_API_URL,
  CHAINABIT_CLIENT_ID,
  CHAINABIT_OAUTH_REDIRECT_URI,
  SUPABASE_SERVICE_ROLE_KEY,
} from '@lenserfight/utils/env'
import { authenticateRequest } from '../../lib/auth/authenticate'

const STATE_TTL_MS = 10 * 60 * 1000

export interface ChainabitStatePayload {
  flowType: 'login' | 'connect'
  userId?: string
  returnUrl: string
  codeVerifier: string
  nonce: string
  expiresAt: number
}

export function buildSignedState(payload: ChainabitStatePayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', SUPABASE_SERVICE_ROLE_KEY()).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

function generatePkce(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
  return { codeVerifier, codeChallenge }
}

function buildAuthorizeUrl(codeChallenge: string, state: string, scope: string): string {
  const url = new URL(`${CHAINABIT_API_URL()}/oauth/authorize`)
  url.searchParams.set('client_id', CHAINABIT_CLIENT_ID())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', CHAINABIT_OAUTH_REDIRECT_URI())
  url.searchParams.set('scope', scope)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', state)
  return url.toString()
}

/** GET /v1/partners/chainabit/oauth/start — requires user JWT, links Chainabit wallet. */
export async function handlePartnersOAuthStartRoute(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const auth = await authenticateRequest(req)
  const url = new URL(req.url!, 'http://localhost')
  const returnUrl = url.searchParams.get('return_url') ?? '/'

  const { codeVerifier, codeChallenge } = generatePkce()
  const state = buildSignedState({
    flowType: 'connect',
    userId: auth.user.id,
    returnUrl,
    codeVerifier,
    nonce: randomBytes(16).toString('hex'),
    expiresAt: Date.now() + STATE_TTL_MS,
  })

  const authorizeUrl = buildAuthorizeUrl(codeChallenge, state, 'wallet:read execution:run')
  res.writeHead(302, { Location: authorizeUrl })
  res.end()
}

/**
 * GET /v1/auth/chainabit/login — no JWT required, used on Login/Register pages.
 * Initiates the Chainabit OAuth flow for social sign-in into LenserFight.
 */
export async function handleChainabitLoginRoute(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url!, 'http://localhost')
  const returnUrl = url.searchParams.get('return_url') ?? '/'

  const { codeVerifier, codeChallenge } = generatePkce()
  const state = buildSignedState({
    flowType: 'login',
    returnUrl,
    codeVerifier,
    nonce: randomBytes(16).toString('hex'),
    expiresAt: Date.now() + STATE_TTL_MS,
  })

  const authorizeUrl = buildAuthorizeUrl(codeChallenge, state, 'email:read profile:read wallet:read execution:run')
  res.writeHead(302, { Location: authorizeUrl })
  res.end()
}
