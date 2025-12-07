
import { User, AuthStateChangeCallback } from '../types/auth.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

// --- Port (Interface) ---
export interface AuthRepositoryPort {
  login(email: string, password: string, captchaToken?: string): Promise<User>;
  register(email: string, password: string, metadata?: { display_name?: string }, captchaToken?: string): Promise<User>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  requestPasswordReset(email: string, captchaToken?: string): Promise<void>;
  resetPassword(password: string, token?: string): Promise<void>;
  signInWithOAuth(provider: 'google' | 'github' | 'azure'): Promise<void>;
  resendSignupConfirmation(email: string): Promise<void>;
  onAuthStateChange(callback: AuthStateChangeCallback): () => void;
}

// --- Mock Implementation ---
export class MockAuthRepository implements AuthRepositoryPort {
  private STORAGE_KEY = 'mock_auth_user';
  private USERS_DB_KEY = 'mock_users_db';
  private RESET_TOKENS_KEY = 'mock_reset_tokens';

  constructor() {
    this.seedDemoUser();
  }

  private seedDemoUser() {
    const existing = storage.getItem(this.USERS_DB_KEY);
    if (!existing) {
      const demoUser: User & { password: string } = {
        id: 'user-1',
        email: 'demo@example.com',
        password: 'password',
        created_at: new Date().toISOString(),
        user_metadata: { display_name: 'Demo User' },
        last_sign_in_at: new Date().toISOString(),
      };
      storage.setItem(this.USERS_DB_KEY, JSON.stringify([demoUser]));
    }
  }

  async login(email: string, password: string, captchaToken?: string): Promise<User> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const usersJson = storage.getItem(this.USERS_DB_KEY);
    const users: (User & { password: string })[] = usersJson ? JSON.parse(usersJson) : [];
    
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      throw new Error('User not registered. Please sign up first.');
    }

    if (user.password !== password) {
      throw new Error('Invalid credentials');
    }

    // Clone user to avoid returning password field
    const { password: _, ...safeUser } = user;
    
    storage.setItem(this.STORAGE_KEY, JSON.stringify(safeUser));
    return safeUser as User;
  }

  async register(email: string, password: string, metadata?: { display_name?: string }, captchaToken?: string): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const usersJson = storage.getItem(this.USERS_DB_KEY);
    const users: (User & { password: string })[] = usersJson ? JSON.parse(usersJson) : [];

    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('User already exists with this email');
    }
    
    const newUser: User & { password: string } = {
      id: `user-${Date.now()}-uuid-mock`,
      email,
      password, // Store password for mock authentication
      created_at: new Date().toISOString(),
      user_metadata: metadata || {},
      last_sign_in_at: new Date().toISOString(),
    };
    
    users.push(newUser);
    storage.setItem(this.USERS_DB_KEY, JSON.stringify(users));
    
    // We do NOT log them in automatically in the storage (session)
    // to simulate the "verify email" requirement flow.
    const { password: _, ...safeUser } = newUser;
    return safeUser as User;
  }

  async logout(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    storage.removeItem(this.STORAGE_KEY);
  }

  async getCurrentUser(): Promise<User | null> {
    const stored = storage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  async requestPasswordReset(email: string, captchaToken?: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600));
    // ... existing logic ...
    return; 
  }

  async resetPassword(password: string, token?: string): Promise<void> {
    // ... existing logic ...
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  async signInWithOAuth(provider: 'google' | 'github' | 'azure'): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600));
    alert(`[MOCK] OAuth provider '${provider}' selected.\n\nIn a real app, this would redirect to the identity provider.`);
  }

  async resendSignupConfirmation(email: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`[Mock] Resending confirmation email to ${email}`);
  }

  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    return () => {};
  }
}

// --- Supabase Implementation (Stub) ---
export class SupabaseAuthRepository implements AuthRepositoryPort {
  async login(email: string, password: string, captchaToken?: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password,
        options: { captchaToken }
    });
    if (error) throw error;
    if (!data.user) throw new Error("No user returned");
    
    const user = data.user as unknown as User;
    return user; 
  }

  async register(email: string, password: string, metadata?: { display_name?: string }, captchaToken?: string): Promise<User> {
    const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: metadata, captchaToken }
    });
    if (error) throw error;
    if (!data.user) throw new Error("No user returned");
    return data.user as unknown as User;
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  async getCurrentUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    const user = data.user as unknown as User;
    return user || null;
  }

  async requestPasswordReset(email: string, captchaToken?: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset-password`,
      captchaToken
    });
    if (error) throw error;
  }

  async resetPassword(password: string, token?: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: password });
    if (error) throw error;
  }

  async signInWithOAuth(provider: 'google' | 'github' | 'azure'): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: `${window.location.origin}/#/app` }
    });
    if (error) throw error;
  }

  async resendSignupConfirmation(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email });
    if (error) throw error;
  }

  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user as unknown as User;
      callback(user || null);
    });
    return () => subscription.unsubscribe();
  }
}