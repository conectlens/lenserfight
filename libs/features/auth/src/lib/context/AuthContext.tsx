import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { queryClient, queryKeys } from '@lenserfight/data/cache'
import { authService, lenserService, partnerProvisioningRepository } from '@lenserfight/data/repositories'
import { AuthState, UserMetadata } from '@lenserfight/types'
import { buildAuthReturnUrl } from '@lenserfight/utils/dom'
import { AUTH_BASE_URL, getEnvMetadata } from '@lenserfight/utils/env'
import { storage } from '@lenserfight/utils/storage'

interface RegisterOptions {
  displayName?: string
  preferredLanguage?: string
}

interface AuthContextType extends AuthState {
  login: (email: string, pass: string, captchaToken?: string) => Promise<void>
  register: (
    email: string,
    pass: string,
    options?: RegisterOptions,
    captchaToken?: string
  ) => Promise<void>
  logout: () => Promise<void>
  requestPasswordReset: (email: string, captchaToken?: string) => Promise<void>
  resetPassword: (password: string, token?: string) => Promise<void>
  signInWithOAuth: (provider: 'google' | 'github' | 'azure') => Promise<void>
  resendSignupConfirmation: (email: string) => Promise<void>
  /** Redirect to the external auth app login page, preserving the current page as return_url. */
  redirectToLogin: (delayMs?: number) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// sessionStorage-backed guard: survives React Strict Mode and HMR (unlike module-level booleans
// which reset on every hot-reload in dev). Key is scoped by user ID so switching accounts works.
const _deletionCheckKey = (userId: string) => `acdr_${userId}`

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'An unexpected error occurred'
}

// Keys cleared on logout (also used in LenserContext)
export const LENSER_CACHE_KEY = 'lenser_profile_data_v1'
export const WAITINGLIST_CACHE_KEY = 'waitinglist_status_v1'
const MOCK_AUTH_KEY = 'mock_auth_user'
const AUTH_PROFILE_GATE_QUERY_KEY = ['lenser', 'auth-profile-gate'] as const

const clearAuthStorage = () => {
  storage.removeItem('lenser_has_profile')
  storage.removeItem(LENSER_CACHE_KEY)
  storage.removeItem(WAITINGLIST_CACHE_KEY)
  storage.removeItem(MOCK_AUTH_KEY)
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  })

  // Tracks whether initAuth has already settled state so the onAuthStateChange
  // subscription does not overwrite it with a stale INITIAL_SESSION event.
  const initDone = useRef(false)
  const loginTransitionInFlight = useRef(false)
  // Track whether the user was previously authenticated so we only clear caches
  // on actual sign-out transitions (not null → null for anonymous users).
  const wasAuthenticated = useRef(false)

  const restoreLenserAccountIfNeeded = useCallback(async (): Promise<boolean> => {
    try {
      const result = await lenserService.cancelDeletionOnLogin()
      if (result?.restored) {
        queryClient.removeQueries({ queryKey: queryKeys.lenser.authenticated() })
        queryClient.removeQueries({ queryKey: AUTH_PROFILE_GATE_QUERY_KEY })
      }
      return true
    } catch (err) {
      console.warn('Failed to check account recovery on login', err)
      return false
    }
  }, [])

  useEffect(() => {
    // 1. Subscribe before initAuth to avoid missing events that fire synchronously
    //    during subscription setup (Supabase fires INITIAL_SESSION immediately).
    const unsubscribe = authService.onAuthStateChange((user) => {
      // Skip early INITIAL_SESSION fires — initAuth owns the first state write.
      // After that, apply any subsequent changes (token refresh, sign-out, etc.)
      if (!initDone.current) return
      if (loginTransitionInFlight.current && user) return
      // Clear stale caches on actual sign-out (user was authenticated, now is not).
      // Skip for anonymous users (null → null) to avoid wiping in-flight public queries.
      if (!user && wasAuthenticated.current) {
        queryClient.clear()
        clearAuthStorage()
      }
      wasAuthenticated.current = !!user
      setState((s) => {
        if (s.user?.id === user?.id && !s.isLoading) return s
        return { ...s, user, isAuthenticated: !!user, isLoading: false }
      })
    })

    // 2. Initial load from persisted session or network
    const initAuth = async () => {
      if (initDone.current) return
      initDone.current = true
      try {
        const user = await authService.getCurrentUser()
        if (user) {
          if (!sessionStorage.getItem(_deletionCheckKey(user.id))) {
            const restored = await restoreLenserAccountIfNeeded()
            if (restored) {
              sessionStorage.setItem(_deletionCheckKey(user.id), '1')
            }
          }
          wasAuthenticated.current = true
          setState((s) => ({ ...s, user, isAuthenticated: true, isLoading: false }))
        } else {
          wasAuthenticated.current = false
          setState((s) => ({ ...s, user: null, isAuthenticated: false, isLoading: false }))
        }
      } catch (err: any) {
        // AuthSessionMissingError is expected when no session exists — not a real error
        if (
          err?.name === 'AuthSessionMissingError' ||
          err?.message?.includes('Auth session missing')
        ) {
          setState((s) => ({ ...s, user: null, isAuthenticated: false, isLoading: false }))
          return
        }
        console.error('Auth initialization error:', err)
        // User deleted in DB but JWT still valid → force clean logout
        if (
          err?.code === 'user_not_found' ||
          err?.message?.includes('User from sub claim in JWT does not exist')
        ) {
          console.warn('User not found in database, clearing session...')
          await authService.logout()
          clearAuthStorage()
          setState({ user: null, isAuthenticated: false, isLoading: false, error: null })
          return
        }
        // 403 Forbidden: token revoked, expired, or invalid → force clean logout
        if (err?.status === 403) {
          console.warn('Auth token forbidden (403), forcing clean logout...')
          await authService.logout()
          clearAuthStorage()
          queryClient.clear()
          setState({ user: null, isAuthenticated: false, isLoading: false, error: null })
          return
        }
        setState((s) => ({ ...s, isLoading: false, error: 'Failed to restore session' }))
      }
    }

    initAuth()

    return () => {
      unsubscribe()
    }
  }, [restoreLenserAccountIfNeeded])

  const login = useCallback(async (email: string, pass: string, captchaToken?: string) => {
    setState((s) => ({ ...s, error: null }))
    loginTransitionInFlight.current = true
    try {
      const user = await authService.login(email, pass, captchaToken)
      if (!sessionStorage.getItem(_deletionCheckKey(user.id))) {
        const restored = await restoreLenserAccountIfNeeded()
        if (restored) {
          sessionStorage.setItem(_deletionCheckKey(user.id), '1')
        }
      }
      wasAuthenticated.current = true
      setState({ user, isAuthenticated: true, isLoading: false, error: null })

      // Update environment metadata in the background — do not block the login flow
      getEnvMetadata().then((env) => {
        const metadata: Partial<UserMetadata> = {
          detected_language: env.detected_language,
          timezone: env.timezone,
          country: env.country,
        }
        authService.updateMetadata(metadata).catch((e) =>
          console.warn('Failed to update user metadata on login', e)
        )
      })
    } catch (err: unknown) {
      const message = getErrorMessage(err)
      setState((s) => ({ ...s, isLoading: false, error: message }))
      throw err
    } finally {
      loginTransitionInFlight.current = false
    }
  }, [restoreLenserAccountIfNeeded])

  const register = useCallback(
    async (email: string, pass: string, options?: RegisterOptions, captchaToken?: string) => {
      setState((s) => ({ ...s, error: null }))
      try {
        const env = await getEnvMetadata()
        const metadata: UserMetadata = {
          display_name: options?.displayName,
          preferred_language: options?.preferredLanguage,
          ui_language: options?.preferredLanguage || env.detected_language,
          detected_language: env.detected_language,
          timezone: env.timezone,
          country: env.country,
        }
        const user = await authService.register(email, pass, metadata, captchaToken)
        wasAuthenticated.current = true
        setState({ user, isAuthenticated: true, isLoading: false, error: null })
      } catch (err: unknown) {
        const message = getErrorMessage(err)
        setState((s) => ({ ...s, isLoading: false, error: message }))
        throw err
      }
    },
    []
  )

  const logout = useCallback(async () => {
    // Clear all per-user deletion check keys from this session
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith('acdr_'))
      .forEach((k) => sessionStorage.removeItem(k))
    // Best-effort: revoke Chainabit developer token before signing out
    partnerProvisioningRepository.revokeToken('chainabit').catch(() => {})
    try {
      await authService.logout()
    } catch (e) {
      console.error('Logout error', e)
    }
    wasAuthenticated.current = false
    queryClient.clear()
    clearAuthStorage()
    setState({ user: null, isAuthenticated: false, isLoading: false, error: null })
  }, [])

  const requestPasswordReset = useCallback(async (email: string, captchaToken?: string) => {
    await authService.requestPasswordReset(email, captchaToken)
  }, [])

  const resetPassword = useCallback(async (password: string, token?: string) => {
    await authService.resetPassword(password, token)
  }, [])

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github' | 'azure') => {
    try {
      await authService.signInWithOAuth(provider)
    } catch (err: unknown) {
      const message = getErrorMessage(err)
      setState((s) => ({ ...s, error: message }))
      throw err
    }
  }, [])

  const resendSignupConfirmation = useCallback(async (email: string) => {
    await authService.resendSignupConfirmation(email)
  }, [])

  const redirectToLogin = useCallback((delayMs = 0) => {
    const returnUrl = encodeURIComponent(buildAuthReturnUrl(window.location.href))
    const target = `${AUTH_BASE_URL}/login?return_url=${returnUrl}`
    if (delayMs > 0) {
      setTimeout(() => { window.location.href = target }, delayMs)
    } else {
      window.location.href = target
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        requestPasswordReset,
        resetPassword,
        signInWithOAuth,
        resendSignupConfirmation,
        redirectToLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
