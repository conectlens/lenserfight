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

export type AuthStateChangeCallback = (user: User | null) => void
