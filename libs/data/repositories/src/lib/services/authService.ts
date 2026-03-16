import { SupabaseAuthRepository } from '../repositories/authRepository'
import { User, AuthStateChangeCallback, UserMetadata } from '@lenserfight/types'

const authRepo = new SupabaseAuthRepository()

export const authService = {
  login: async (email: string, password: string, captchaToken?: string): Promise<User> => {
    return authRepo.login(email, password, captchaToken)
  },

  register: async (
    email: string,
    password: string,
    metadata?: UserMetadata,
    captchaToken?: string
  ): Promise<User> => {
    return authRepo.register(email, password, metadata, captchaToken)
  },

  logout: async (): Promise<void> => {
    return authRepo.logout()
  },

  getCurrentUser: async (): Promise<User | null> => {
    return authRepo.getCurrentUser()
  },

  updateMetadata: async (metadata: Partial<UserMetadata>): Promise<void> => {
    return authRepo.updateMetadata(metadata)
  },

  requestPasswordReset: async (email: string, captchaToken?: string): Promise<void> => {
    return authRepo.requestPasswordReset(email, captchaToken)
  },

  resetPassword: async (password: string, token?: string): Promise<void> => {
    return authRepo.resetPassword(password, token)
  },

  signInWithOAuth: async (provider: 'google' | 'github' | 'azure'): Promise<void> => {
    return authRepo.signInWithOAuth(provider)
  },

  resendSignupConfirmation: async (email: string): Promise<void> => {
    return authRepo.resendSignupConfirmation(email)
  },

  onAuthStateChange: (callback: AuthStateChangeCallback): (() => void) => {
    return authRepo.onAuthStateChange(callback)
  },
}
