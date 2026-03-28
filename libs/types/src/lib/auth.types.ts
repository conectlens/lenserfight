import type { LenserAccountStatus } from './lenser.types'

export interface UserMetadata {
  display_name?: string
  preferred_language?: string
  ui_language?: string
  detected_language?: string
  timezone?: string
  country?: string
  [key: string]: any
}

export interface User {
  id: string // uuid
  email?: string
  encrypted_password?: string // Not typically exposed on client, but in schema
  user_metadata?: UserMetadata
  created_at: string
  updated_at?: string
  last_sign_in_at?: string
}

export interface AuthSession {
  user: User | null
  access_token?: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface AuthProfileGate {
  kind: 'active' | 'new' | 'onboarding' | 'recoverable' | 'deleted'
  status?: LenserAccountStatus
  onboardingStep?: number
  deletionDeadlineAt?: string | null
}

export type AuthStateChangeCallback = (user: User | null) => void

// ---------------------------------------------------------------------------
// Device approval + developer token DTOs
// ---------------------------------------------------------------------------

export interface DeviceApprovalRequestDTO {
  label?: string | null
  /** Short-lived approval request lifetime in minutes. Server caps this value. */
  requestTtlMinutes?: number
  /** Time-bounded developer token lifetime in hours. Server caps this value. */
  tokenTtlHours?: number
}

export interface DeviceApprovalRequestResultDTO {
  requestId: string
  requestSecret: string
  userCode: string
  verificationUri: string
  verificationUriComplete: string
  pollIntervalSeconds: number
  expiresAt: string
  status: 'pending'
}

export interface ApproveDeviceRequestDTO {
  userCode: string
}

export interface ApproveDeviceRequestResultDTO {
  requestId: string
  status: 'approved' | 'pending' | 'expired' | 'not_found'
  approvedAt?: string | null
  expiresAt?: string | null
  label?: string | null
}

export interface ExchangeDeviceApprovalDTO {
  requestId: string
  requestSecret: string
}

export interface DeveloperTokenGrantDTO {
  tokenId: string
  token: string
  label: string | null
  tokenPrefix: string
  expiresAt: string
  createdAt: string
}

export interface DeveloperTokenExchangeResultDTO {
  requestId: string
  status: 'pending' | 'approved' | 'expired' | 'invalid'
  pollIntervalSeconds: number
  expiresAt: string
  approvedAt?: string | null
  tokenId?: string
  token?: string
  label?: string | null
  tokenPrefix?: string
  createdAt?: string
}

export interface DeveloperTokenSummaryDTO {
  id: string
  label: string | null
  tokenPrefix: string
  status: 'active' | 'expired' | 'revoked'
  expiresAt: string
  createdAt: string
  revokedAt: string | null
  lastUsedAt: string | null
}
