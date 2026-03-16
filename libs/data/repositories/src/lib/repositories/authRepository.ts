import { User, AuthStateChangeCallback, UserMetadata } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'

// --- Port (Interface) ---
export interface AuthRepositoryPort {
  login(email: string, password: string, captchaToken?: string): Promise<User>
  register(
    email: string,
    password: string,
    metadata?: UserMetadata,
    captchaToken?: string
  ): Promise<User>
  logout(): Promise<void>
  getCurrentUser(): Promise<User | null>
  updateMetadata(metadata: Partial<UserMetadata>): Promise<void>
  requestPasswordReset(email: string, captchaToken?: string): Promise<void>
  resetPassword(password: string, token?: string): Promise<void>
  signInWithOAuth(provider: 'google' | 'github' | 'azure'): Promise<void>
  resendSignupConfirmation(email: string): Promise<void>
  onAuthStateChange(callback: AuthStateChangeCallback): () => void
}
export class SupabaseAuthRepository implements AuthRepositoryPort {
  async login(email: string, password: string, captchaToken?: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    })
    if (error) throw error
    if (!data.user) throw new Error('No user returned')
    return data.user as unknown as User
  }

  async register(
    email: string,
    password: string,
    metadata?: UserMetadata,
    captchaToken?: string
  ): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata, captchaToken },
    })
    if (error) throw error
    if (!data.user) throw new Error('No user returned')
    return data.user as unknown as User
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut()
  }

  async getCurrentUser(): Promise<User | null> {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    const user = data.user as unknown as User
    return user || null
  }

  async updateMetadata(metadata: Partial<UserMetadata>): Promise<void> {
    const { error } = await supabase.auth.updateUser({ data: metadata })
    if (error) throw error
  }


  async requestPasswordReset(email: string, captchaToken?: string): Promise<void> {
    const authAppUrl = import.meta.env.VITE_AUTH_APP_URL ?? window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${authAppUrl}/reset-password`,
      captchaToken,
    })
    if (error) throw error
  }

  async resetPassword(password: string, token?: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: password })
    if (error) throw error
  }

  async signInWithOAuth(provider: 'google' | 'github' | 'azure'): Promise<void> {
    const authAppUrl = import.meta.env.VITE_AUTH_APP_URL ?? window.location.origin
    // Preserve the originating page so /callback can redirect back after OAuth.
    // Priority: explicit return_url query param → current full page URL.
    // Use sessionStorage (not localStorage) so stale return URLs don't persist
    // across unrelated browser sessions.
    const returnUrl =
      new URLSearchParams(window.location.search).get('return_url') ?? window.location.href
    sessionStorage.setItem('auth_return_url', returnUrl)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: `${authAppUrl}/callback` },
    })
    if (error) throw error
  }

  async resendSignupConfirmation(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email })
    if (error) throw error
  }

  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user as unknown as User
      callback(user || null)
    })
    return () => subscription.unsubscribe()
  }
}
