import React, { useEffect } from 'react'
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
 * Handles the post-OAuth redirect from Supabase / provider.
 *
 * The previous implementation called `getSession()` immediately, which raced
 * against Supabase's `detectSessionInUrl` processing of the URL hash fragment
 * (PKCE / implicit flows). When the race was lost, getSession() returned null
 * and the user was incorrectly sent back to /login.
 *
 * Fix: subscribe to `onAuthStateChange` and wait for the `SIGNED_IN` event.
 * As a belt-and-suspenders measure we also call getSession() in case the code
 * exchange already completed before the component mounted.
 *
 * After OAuth succeeds we return to apps/auth first so the same profile-gate
 * logic runs for OAuth and password sign-ins.
 */
export const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    let redirected = false

    const redirect = (session: { user: unknown } | null) => {
      if (redirected || !session) return
      redirected = true
      const returnUrl = sanitizeReturnUrl(resolveReturnUrl())
      sessionStorage.removeItem(RETURN_URL_KEY)
      replaceLocationSafely(getPostOAuthRedirectUrl(returnUrl))
    }

    // 1. Subscribe first so we don't miss the SIGNED_IN event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        redirect(session)
      } else if (!redirected && (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED')) {
        // Unexpected terminal state without a session
        navigate('/login', { replace: true })
      }
    })

    // 2. Belt-and-suspenders: session may already be available if the code
    //    exchange completed before the component mounted (PKCE with server redirect)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        redirect(data.session)
      }
    })

    // Timeout guard: if neither event fires within 10s, abort to login
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
