import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@lenserfight/data/supabase'
import { LoadingOverlay } from '@lenserfight/ui/components'
import { getPostOAuthRedirectUrl } from '../utils/authRedirects'
import { replaceLocationSafely, sanitizeReturnUrl } from '../utils/validateReturnUrl'

const RETURN_URL_KEY = 'auth_return_url'

// When arriving via a Chainabit magic-link redirect the sessionStorage key is
// not set (the user never visited LoginPage in this tab). Fall back to the
// ?return_url query param that the Edge Function embeds in the redirectTo URL.
function resolveReturnUrl(): string {
  const fromStorage = sessionStorage.getItem(RETURN_URL_KEY)
  if (fromStorage) return fromStorage
  const params = new URLSearchParams(window.location.search)
  return params.get('return_url') ?? ''
}

/**
 * Parse implicit-grant tokens from a URL hash fragment.
 * Returns null if the required tokens are not present.
 */
function parseHashTokens(hash: string): { access_token: string; refresh_token: string } | null {
  if (!hash || hash.length < 2) return null
  try {
    const params = new URLSearchParams(hash.substring(1))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    if (access_token && refresh_token) return { access_token, refresh_token }
  } catch {
    // malformed hash — ignore
  }
  return null
}

/**
 * Handles the post-OAuth redirect from Supabase / provider.
 *
 * Supabase may redirect back with either:
 *  - `#access_token=…` (implicit grant flow)
 *  - `?code=…` (PKCE flow)
 *
 * The Supabase client's `detectSessionInUrl` handles both automatically during
 * its internal `_initialize()` call. However, the session save to cookie
 * storage can silently fail when the serialised session exceeds the browser's
 * ~4 KB per-cookie limit, and navigator.locks serialisation can delay the
 * SIGNED_IN event past our listener setup.
 *
 * Defence-in-depth strategy:
 *  1. Capture the raw hash fragment *before* `_initialize()` clears it.
 *  2. Subscribe to onAuthStateChange for SIGNED_IN / INITIAL_SESSION.
 *  3. After initialisation completes, check getSession() — if the auto-detect
 *     worked, redirect immediately.
 *  4. If getSession() returns null (storage failure), fall back to an explicit
 *     `setSession()` using the captured hash tokens.
 *  5. Timeout guard at 10 s aborts to /login.
 */
export const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate()
  // Capture hash *immediately* at module-render time, before Supabase's
  // _initialize() clears it via `window.location.hash = ''`.
  const capturedHash = useRef(window.location.hash)

  useEffect(() => {
    let redirected = false

    const redirect = (session: { user: unknown } | null) => {
      if (redirected || !session) return
      redirected = true
      const returnUrl = sanitizeReturnUrl(resolveReturnUrl())
      sessionStorage.removeItem(RETURN_URL_KEY)
      replaceLocationSafely(getPostOAuthRedirectUrl(returnUrl))
    }

    // 1. Subscribe first so we don't miss the session event.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        redirect(session)
      } else if (!redirected && event === 'SIGNED_OUT') {
        navigate('/login', { replace: true })
      }
    })

    // 2. After Supabase initialisation completes, try to redirect.
    //    If detectSessionInUrl worked, getSession() returns the session.
    //    If it failed (e.g. cookie storage dropped the oversized value),
    //    fall back to an explicit setSession() from the captured hash.
    const resolveSession = async () => {
      // getSession() internally awaits initializePromise, so this waits for
      // detectSessionInUrl to finish its attempt.
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        redirect(data.session)
        return
      }

      // detectSessionInUrl didn't produce a persisted session — try manually.
      const tokens = parseHashTokens(capturedHash.current)
      if (tokens) {
        const { data: manualData, error } = await supabase.auth.setSession(tokens)
        if (!error && manualData.session) {
          redirect(manualData.session)
          return
        }
        if (error) {
          console.warn('[OAuthCallback] setSession fallback failed:', error.message)
        }
      }

      // PKCE flow: ?code= is handled entirely by detectSessionInUrl.
      // If we reach here with a ?code param, the exchange may still be in
      // progress. Retry getSession() a few times before giving up.
      const hasCode = new URLSearchParams(window.location.search).has('code')
      if (hasCode) {
        for (let attempt = 0; attempt < 3 && !redirected; attempt++) {
          await new Promise((r) => setTimeout(r, 600))
          const { data: retryData } = await supabase.auth.getSession()
          if (retryData.session) {
            redirect(retryData.session)
            return
          }
        }
      }
    }

    resolveSession()

    // Timeout guard: if nothing succeeds within 10 s, abort to login.
    const timeout = setTimeout(() => {
      if (!redirected) {
        navigate('/login', { replace: true })
      }
    }, 10_000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  return <LoadingOverlay message="Completing sign in..." />
}
