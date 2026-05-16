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
import { createAuthRepository } from '../factory'

const authRepo = createAuthRepository()

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

  sendMagicLink: async (email: string, captchaToken?: string): Promise<void> => {
    return authRepo.sendMagicLink(email, captchaToken)
  },

  onAuthStateChange: (callback: AuthStateChangeCallback): (() => void) => {
    return authRepo.onAuthStateChange(callback)
  },

  requestDeviceApproval: (
    dto: DeviceApprovalRequestDTO = {}
  ): Promise<DeviceApprovalRequestResultDTO> => {
    return authRepo.requestDeviceApproval(dto)
  },

  approveDeviceRequest: (
    dto: ApproveDeviceRequestDTO
  ): Promise<ApproveDeviceRequestResultDTO> => {
    return authRepo.approveDeviceRequest(dto)
  },

  exchangeDeviceApproval: (
    dto: ExchangeDeviceApprovalDTO
  ): Promise<DeveloperTokenExchangeResultDTO> => {
    return authRepo.exchangeDeviceApproval(dto)
  },

  listDeveloperTokens: (): Promise<DeveloperTokenSummaryDTO[]> => {
    return authRepo.listDeveloperTokens()
  },

  revokeDeveloperToken: async (tokenId: string): Promise<void> => {
    return authRepo.revokeDeveloperToken(tokenId)
  },
}
