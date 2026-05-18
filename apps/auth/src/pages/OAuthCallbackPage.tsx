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
 * With PKCE flow (Supabase JS v2 default) the provider redirects back with
 * ?code=XXXX. Supabase's detectSessionInUrl exchanges the code asynchronously
 * and fires onAuthStateChange. Two events can signal a completed exchange:
 *
 *  - SIGNED_IN     — new session for a user who was not previously signed in
 *  - INITIAL_SESSION — session restored from storage OR the code was exchanged
 *                      and the user was already signed in (same UID). Supabase
 *                      fires this instead of SIGNED_IN in that case.
 *
 * We handle both, plus a getSession() poll as a belt-and-suspenders measure.
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

    // 1. Subscribe first so we don't miss the session event.
    //    Handle both SIGNED_IN (new session) and INITIAL_SESSION (returning user
    //    whose UID didn't change — Supabase v2 fires this instead of SIGNED_IN).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        redirect(session)
      } else if (!redirected && event === 'SIGNED_OUT') {
        // Exchange failed or session was revoked — abort to login
        navigate('/login', { replace: true })
      }
      // TOKEN_REFRESHED is intentionally not handled here: it can fire as a
      // side-effect of the PKCE exchange before SIGNED_IN and must not abort.
    })

    // 2. Belt-and-suspenders: poll getSession() in case the code exchange
    //    completed before our subscription was set up. Retry a few times to
    //    handle the async PKCE exchange window.
    const pollSession = async () => {
      for (let attempt = 0; attempt < 3 && !redirected; attempt++) {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          redirect(data.session)
          return
        }
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }
    }
    pollSession()

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
