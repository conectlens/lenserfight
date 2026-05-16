import type {
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
import type { AuthRepositoryPort } from '../authRepository'

const SESSION_KEY = 'lf_file_auth_session'

/** Fixed local dev user. Credentials are cosmetic — any input is accepted. */
const FILE_MODE_USER: User = {
  id: 'file-user-00000000-0000-0000-0000-000000000001',
  email: 'dev@lenserfight.local',
  user_metadata: {
    display_name: 'Local Dev',
    preferred_language: 'en',
  },
  created_at: '2026-01-01T00:00:00.000Z',
}

function loadSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function saveSession(user: User): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

/** Resolves the local dev user, auto-provisioning on first call. */
function ensureSession(): User {
  const existing = loadSession()
  if (existing) return existing
  saveSession(FILE_MODE_USER)
  return FILE_MODE_USER
}

export class FileAuthRepository implements AuthRepositoryPort {
  /** Auto-provisions the dev user on first load — no login screen required. */
  async getCurrentUser(): Promise<User | null> {
    return ensureSession()
  }

  async login(_email: string, _password: string, _captchaToken?: string): Promise<User> {
    const user = loadSession() ?? FILE_MODE_USER
    saveSession(user)
    return user
  }

  async register(
    _email: string,
    _password: string,
    metadata?: UserMetadata
  ): Promise<User> {
    const user: User = {
      ...FILE_MODE_USER,
      user_metadata: { ...FILE_MODE_USER.user_metadata, ...metadata },
    }
    saveSession(user)
    return user
  }

  async logout(): Promise<void> {
    clearSession()
  }

  async updateMetadata(metadata: Partial<UserMetadata>): Promise<void> {
    const user = loadSession() ?? FILE_MODE_USER
    const updated: User = {
      ...user,
      user_metadata: { ...user.user_metadata, ...metadata },
    }
    saveSession(updated)
  }

  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    // Synchronously notify with the provisioned user and return a no-op unsubscribe.
    const user = ensureSession()
    callback(user)
    return () => {}
  }

  async requestPasswordReset(_email: string, _captchaToken?: string): Promise<void> {
    // No-op in file mode.
  }

  async resetPassword(_password: string, _token?: string): Promise<void> {
    // No-op in file mode.
  }

  async signInWithOAuth(_provider: 'google' | 'github' | 'azure'): Promise<void> {
    // Auto-log in as the local user instead of redirecting to OAuth.
    saveSession(FILE_MODE_USER)
  }

  async resendSignupConfirmation(_email: string): Promise<void> {
    // No-op in file mode.
  }

  async sendMagicLink(_email: string, _captchaToken?: string): Promise<void> {
    // No-op in file mode.
  }

  async requestDeviceApproval(
    _dto?: DeviceApprovalRequestDTO
  ): Promise<DeviceApprovalRequestResultDTO> {
    throw new Error('Device approval is not available in file-storage mode.')
  }

  async approveDeviceRequest(
    _dto: ApproveDeviceRequestDTO
  ): Promise<ApproveDeviceRequestResultDTO> {
    throw new Error('Device approval is not available in file-storage mode.')
  }

  async exchangeDeviceApproval(
    _dto: ExchangeDeviceApprovalDTO
  ): Promise<DeveloperTokenExchangeResultDTO> {
    throw new Error('Device approval is not available in file-storage mode.')
  }

  async listDeveloperTokens(): Promise<DeveloperTokenSummaryDTO[]> {
    return []
  }

  async revokeDeveloperToken(_tokenId: string): Promise<void> {
    // No-op in file mode.
  }
}
