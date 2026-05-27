import { authService } from '@lenserfight/data/repositories'
import type { AuthState, UserMetadata } from '@lenserfight/types'
import { getEnvMetadata } from '@lenserfight/utils/env'
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

interface RegisterOptions {
  displayName?: string
  preferredLanguage?: string
}

type OAuthProvider = 'google' | 'github' | 'apple' | 'azure' | 'custom:chainabit'

interface AuthContextType extends AuthState {
  login: (identifier: string, pass: string, captchaToken?: string) => Promise<void>
  register: (
    email: string,
    pass: string,
    options?: RegisterOptions,
    captchaToken?: string
  ) => Promise<void>
  logout: () => Promise<void>
  requestPasswordReset: (email: string, captchaToken?: string) => Promise<void>
  resetPassword: (password: string) => Promise<void>
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>
  resendSignupConfirmation: (email: string) => Promise<void>
  sendMagicLink: (email: string, captchaToken?: string) => Promise<void>
  redirectToLogin: (delayMs?: number) => void
  isRecoverySession: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const LENSER_CACHE_KEY = 'lenser_profile_data_v1'
export const WAITINGLIST_CACHE_KEY = 'waitinglist_status_v1'

const isEmailLike = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  })
  const [isRecoverySession, setIsRecoverySession] = useState(false)

  useEffect(() => {
    let disposed = false
    const unsubscribe = authService.onAuthStateChange((user, event) => {
      if (disposed) return
      setIsRecoverySession(event === 'PASSWORD_RECOVERY')
      setState((current) => ({
        ...current,
        user,
        isAuthenticated: !!user,
        isLoading: false,
        error: null,
      }))
    })

    authService
      .getCurrentUser()
      .then((user) => {
        if (disposed) return
        setState({ user, isAuthenticated: !!user, isLoading: false, error: null })
      })
      .catch(() => {
        if (disposed) return
        setState({ user: null, isAuthenticated: false, isLoading: false, error: null })
      })

    return () => {
      disposed = true
      unsubscribe()
    }
  }, [])

  const login = useCallback(async (identifier: string, pass: string, captchaToken?: string) => {
    setState((current) => ({ ...current, error: null }))
    try {
      let email = identifier.trim()
      if (!isEmailLike(email)) {
        const handle = email.startsWith('@') ? email.slice(1) : email
        const resolved = await authService.resolveHandleToEmail(handle)
        if (!resolved) throw new Error('Invalid login credentials')
        email = resolved
      }
      const user = await authService.login(email, pass, captchaToken)
      setState({ user, isAuthenticated: true, isLoading: false, error: null })
    } catch (error) {
      const message = toMessage(error)
      setState((current) => ({ ...current, isLoading: false, error: message }))
      throw error
    }
  }, [])

  const register = useCallback(
    async (email: string, pass: string, options?: RegisterOptions, captchaToken?: string) => {
      setState((current) => ({ ...current, error: null }))
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
        setState({ user, isAuthenticated: true, isLoading: false, error: null })
      } catch (error) {
        const message = toMessage(error)
        setState((current) => ({ ...current, isLoading: false, error: message }))
        throw error
      }
    },
    []
  )

  const logout = useCallback(async () => {
    await authService.logout()
    setState({ user: null, isAuthenticated: false, isLoading: false, error: null })
  }, [])

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    try {
      await authService.signInWithOAuth(provider)
    } catch (error) {
      const message = toMessage(error)
      setState((current) => ({ ...current, error: message }))
      throw error
    }
  }, [])

  const sendMagicLink = useCallback(async (email: string, captchaToken?: string) => {
    try {
      await authService.sendMagicLink(email, captchaToken)
    } catch (error) {
      const message = toMessage(error)
      setState((current) => ({ ...current, error: message }))
      throw error
    }
  }, [])

  const requestPasswordReset = useCallback(
    (email: string, captchaToken?: string) => authService.requestPasswordReset(email, captchaToken),
    []
  )

  const resetPassword = useCallback(async (password: string) => {
    await authService.resetPassword(password)
    setIsRecoverySession(false)
  }, [])

  const resendSignupConfirmation = useCallback(
    (email: string) => authService.resendSignupConfirmation(email),
    []
  )

  const redirectToLogin = useCallback(() => {
    setState((current) => ({ ...current, isAuthenticated: false }))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isRecoverySession,
        login,
        register,
        logout,
        requestPasswordReset,
        resetPassword,
        signInWithOAuth,
        resendSignupConfirmation,
        sendMagicLink,
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
