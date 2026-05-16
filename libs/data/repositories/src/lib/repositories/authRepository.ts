import {
  ApproveDeviceRequestDTO,
  ApproveDeviceRequestResultDTO,
  AuthStateChangeCallback,
  DeviceApprovalRequestDTO,
  DeviceApprovalRequestResultDTO,
  DeveloperTokenExchangeResultDTO,
  DeveloperTokenSummaryDTO,
  ExchangeDeviceApprovalDTO,
  User,
  UserMetadata,
} from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'
import { buildAuthReturnUrl } from '@lenserfight/utils/dom'
import { AUTH_BASE_URL } from '@lenserfight/utils/env'

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
  sendMagicLink(email: string, captchaToken?: string): Promise<void>
  onAuthStateChange(callback: AuthStateChangeCallback): () => void
  requestDeviceApproval(dto?: DeviceApprovalRequestDTO): Promise<DeviceApprovalRequestResultDTO>
  approveDeviceRequest(dto: ApproveDeviceRequestDTO): Promise<ApproveDeviceRequestResultDTO>
  exchangeDeviceApproval(dto: ExchangeDeviceApprovalDTO): Promise<DeveloperTokenExchangeResultDTO>
  listDeveloperTokens(): Promise<DeveloperTokenSummaryDTO[]>
  revokeDeveloperToken(tokenId: string): Promise<void>
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${AUTH_BASE_URL}/reset-password`,
      captchaToken,
    })
    if (error) throw error
  }

  async resetPassword(password: string, token?: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: password })
    if (error) throw error
  }

  async signInWithOAuth(provider: 'google' | 'github' | 'azure'): Promise<void> {
    // Preserve the originating page so /callback can redirect back after OAuth.
    // Priority: explicit return_url query param → current full page URL with any
    // auth-only return_url hop removed.
    // Use sessionStorage (not localStorage) so stale return URLs don't persist
    // across unrelated browser sessions.
    const returnUrl = buildAuthReturnUrl(
      new URLSearchParams(window.location.search).get('return_url') ?? window.location.href
    )
    sessionStorage.setItem('auth_return_url', returnUrl)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: `${AUTH_BASE_URL}/callback` },
    })
    if (error) throw error
  }

  async resendSignupConfirmation(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email })
    if (error) throw error
  }

  async sendMagicLink(email: string, captchaToken?: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${AUTH_BASE_URL}/callback`,
        captchaToken,
      },
    })
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

  async requestDeviceApproval(
    dto: DeviceApprovalRequestDTO = {}
  ): Promise<DeviceApprovalRequestResultDTO> {
    const { data, error } = await supabase.rpc('fn_auth_request_device_approval', {
      p_label: dto.label ?? null,
      p_request_ttl_minutes: dto.requestTtlMinutes ?? null,
      p_token_ttl_hours: dto.tokenTtlHours ?? null,
    })

    if (error) throw error
    return data as DeviceApprovalRequestResultDTO
  }

  async approveDeviceRequest(
    dto: ApproveDeviceRequestDTO
  ): Promise<ApproveDeviceRequestResultDTO> {
    const { data, error } = await supabase.rpc('fn_auth_approve_device_request', {
      p_user_code: dto.userCode,
    })

    if (error) throw error
    return data as ApproveDeviceRequestResultDTO
  }

  async exchangeDeviceApproval(
    dto: ExchangeDeviceApprovalDTO
  ): Promise<DeveloperTokenExchangeResultDTO> {
    const { data, error } = await supabase.rpc('fn_auth_exchange_device_approval', {
      p_request_id: dto.requestId,
      p_request_secret: dto.requestSecret,
    })

    if (error) throw error
    return data as DeveloperTokenExchangeResultDTO
  }

  async listDeveloperTokens(): Promise<DeveloperTokenSummaryDTO[]> {
    const { data, error } = await supabase.rpc('fn_auth_list_developer_tokens')
    if (error) throw error
    return (data ?? []) as DeveloperTokenSummaryDTO[]
  }

  async revokeDeveloperToken(tokenId: string): Promise<void> {
    const { error } = await supabase.rpc('fn_auth_revoke_developer_token', {
      p_token_id: tokenId,
    })
    if (error) throw error
  }
}
