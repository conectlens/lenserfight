export interface UserMetadata {
  [key: string]: any;
}

export interface User {
  id: string; // uuid
  email?: string;
  encrypted_password?: string; // Not typically exposed on client, but in schema
  raw_user_meta_data?: UserMetadata;
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string;
}

export interface AuthSession {
  user: User | null;
  access_token?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}