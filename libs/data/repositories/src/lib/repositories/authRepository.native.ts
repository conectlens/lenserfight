import { Linking } from 'react-native'
import { supabase } from '@lenserfight/data/supabase'
import type { AuthChangeEvent } from '@supabase/supabase-js'
import type {
  ApproveDeviceRequestDTO,
  ApproveDeviceRequestResultDTO,
  DeviceApprovalRequestDTO,
  DeviceApprovalRequestResultDTO,
  DeveloperTokenExchangeResultDTO,
  DeveloperTokenSummaryDTO,
  ExchangeDeviceApprovalDTO,
  User,
  UserMetadata,
} from '@lenserfight/types'

export type { AuthChangeEvent }

export type MobileOAuthProvider = 'google' | 'github' | 'apple' | 'azure' | 'custom:chainabit'

export interface AuthRepositoryPort {
  login(email: string, password: string, captchaToken?: string): Promise<User>
  register(email: string, password: string, metadata?: UserMetadata, captchaToken?: string): Promise<User>
  logout(): Promise<void>
  getCurrentUser(): Promise<User | null>
  updateMetadata(metadata: Partial<UserMetadata>): Promise<void>
  requestPasswordReset(email: string, captchaToken?: string): Promise<void>
  resetPassword(password: string, token?: string): Promise<void>
  signInWithOAuth(provider: MobileOAuthProvider): Promise<void>
  resendSignupConfirmation(email: string): Promise<void>
  sendMagicLink(email: string, captchaToken?: string): Promise<void>
  onAuthStateChange(callback: (user: User | null, event: AuthChangeEvent) => void): () => void
  requestDeviceApproval(dto?: DeviceApprovalRequestDTO): Promise<DeviceApprovalRequestResultDTO>
  approveDeviceRequest(dto: ApproveDeviceRequestDTO): Promise<ApproveDeviceRequestResultDTO>
  exchangeDeviceApproval(dto: ExchangeDeviceApprovalDTO): Promise<DeveloperTokenExchangeResultDTO>
  listDeveloperTokens(): Promise<DeveloperTokenSummaryDTO[]>
  revokeDeveloperToken(tokenId: string): Promise<void>
  resolveHandleToEmail(handle: string): Promise<string | null>
}

const mobileRedirectUrl = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL ?? 'lenserfight://auth/callback'

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
      options: { data: metadata, captchaToken, emailRedirectTo: mobileRedirectUrl },
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
    if (error) {
      if (error.name === 'AuthSessionMissingError' || error.message.includes('Auth session missing')) {
        return null
      }
      throw error
    }
    return (data.user as unknown as User) || null
  }

  async updateMetadata(metadata: Partial<UserMetadata>): Promise<void> {
    const { error } = await supabase.auth.updateUser({ data: metadata })
    if (error) throw error
  }

  async requestPasswordReset(email: string, captchaToken?: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: mobileRedirectUrl,
      captchaToken,
    })
    if (error) throw error
  }

  async resetPassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }

  async signInWithOAuth(provider: MobileOAuthProvider): Promise<void> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as never,
      options: {
        redirectTo: mobileRedirectUrl,
        skipBrowserRedirect: true,
      },
    })
    if (error) throw error
    if (data?.url) await Linking.openURL(data.url)
  }

  async resendSignupConfirmation(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) throw error
  }

  async sendMagicLink(email: string, captchaToken?: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: mobileRedirectUrl, captchaToken },
    })
    if (error) throw error
  }

  onAuthStateChange(callback: (user: User | null, event: AuthChangeEvent) => void): () => void {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      callback((session?.user as unknown as User) || null, event)
    })
    return () => subscription.unsubscribe()
  }

  async requestDeviceApproval(): Promise<DeviceApprovalRequestResultDTO> {
    throw new Error('Device approval is not available in the mobile MVP.')
  }

  async approveDeviceRequest(): Promise<ApproveDeviceRequestResultDTO> {
    throw new Error('Device approval is not available in the mobile MVP.')
  }

  async exchangeDeviceApproval(): Promise<DeveloperTokenExchangeResultDTO> {
    throw new Error('Device approval is not available in the mobile MVP.')
  }

  async listDeveloperTokens(): Promise<DeveloperTokenSummaryDTO[]> {
    return []
  }

  async revokeDeveloperToken(): Promise<void> {
    return undefined
  }

  async resolveHandleToEmail(handle: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('fn_resolve_handle_to_email', {
      p_handle: handle,
    })
    if (error) return null
    return (data as string | null) ?? null
  }
}
