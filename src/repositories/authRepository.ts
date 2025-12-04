
import { User, AuthStateChangeCallback } from '../types/auth.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

// --- Port (Interface) ---
export interface AuthRepositoryPort {
  login(email: string, password: string): Promise<User>;
  register(email: string, password: string, metadata?: { display_name?: string }): Promise<User>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(password: string, token?: string): Promise<void>;
  signInWithOAuth(provider: 'google' | 'github' | 'azure'): Promise<void>;
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

  async login(email: string, password: string): Promise<User> {
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

  async register(email: string, password: string, metadata?: { display_name?: string }): Promise<User> {
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

  async requestPasswordReset(email: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600));

    // Check if user exists
    const usersJson = storage.getItem(this.USERS_DB_KEY);
    const users: (User & { password: string })[] = usersJson ? JSON.parse(usersJson) : [];
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // For security, usually we don't say if user exists or not, but for mock we can just return success
      return; 
    }

    // Generate Token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expires = Date.now() + 3600000; // 1 hour

    // Store Token
    const tokensJson = storage.getItem(this.RESET_TOKENS_KEY);
    const tokens = tokensJson ? JSON.parse(tokensJson) : [];
    
    // Remove old tokens for this email
    const validTokens = tokens.filter((t: any) => t.email !== email);
    
    validTokens.push({ token, email, expires });
    storage.setItem(this.RESET_TOKENS_KEY, JSON.stringify(validTokens));

    console.group("MOCK EMAIL SERVICE");
    console.log(`To: ${email}`);
    console.log(`Subject: Password Reset Request`);
    console.log(`Link: ${window.location.origin}/#/reset-password?token=${token}`);
    console.groupEnd();
  }

  async resetPassword(password: string, token?: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 800));

    if (!token) throw new Error("Token is required for password reset");

    const tokensJson = storage.getItem(this.RESET_TOKENS_KEY);
    const tokens = tokensJson ? JSON.parse(tokensJson) : [];
    
    const tokenRecord = tokens.find((t: any) => t.token === token);

    if (!tokenRecord) {
      throw new Error("Invalid or expired password reset token.");
    }

    if (Date.now() > tokenRecord.expires) {
      // Cleanup expired
      const cleanTokens = tokens.filter((t: any) => t.token !== token);
      storage.setItem(this.RESET_TOKENS_KEY, JSON.stringify(cleanTokens));
      throw new Error("Token has expired. Please request a new one.");
    }

    // Update User
    const usersJson = storage.getItem(this.USERS_DB_KEY);
    const users: (User & { password: string })[] = usersJson ? JSON.parse(usersJson) : [];
    const userIndex = users.findIndex(u => u.email.toLowerCase() === tokenRecord.email.toLowerCase());

    if (userIndex === -1) {
      throw new Error("User not found.");
    }

    users[userIndex].password = password;
    users[userIndex].updated_at = new Date().toISOString();
    storage.setItem(this.USERS_DB_KEY, JSON.stringify(users));

    // Remove consumed token
    const remainingTokens = tokens.filter((t: any) => t.token !== token);
    storage.setItem(this.RESET_TOKENS_KEY, JSON.stringify(remainingTokens));
  }

  async signInWithOAuth(provider: 'google' | 'github' | 'azure'): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600));
    alert(`[MOCK] OAuth provider '${provider}' selected.\n\nIn a real app, this would redirect to the identity provider.`);
  }

  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    // In Mock mode, real-time auth state isn't strictly necessary as we handle state manually in Context for actions.
    // We return a no-op unsubscribe function.
    return () => {};
  }
}

// --- Supabase Implementation (Stub) ---
export class SupabaseAuthRepository implements AuthRepositoryPort {
  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("No user returned");
    
    // Map Supabase User to our User type
    return data.user as unknown as User; 
  }

  async register(email: string, password: string, metadata?: { display_name?: string }): Promise<User> {
    const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
            data: metadata
        }
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
    return (data.user as unknown as User) || null;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    });
    if (error) throw error;
  }

  async resetPassword(password: string, token?: string): Promise<void> {
    // In Supabase, if the user followed the link, the session is already active (recovered)
    // We just update the user. The token param is not strictly needed if the session is handled by the client lib.
    const { error } = await supabase.auth.updateUser({ password: password });
    if (error) throw error;
  }

  async signInWithOAuth(provider: 'google' | 'github' | 'azure'): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: `${window.location.origin}/#/app`
      }
    });
    if (error) throw error;
  }

  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user as unknown as User || null);
    });
    return () => subscription.unsubscribe();
  }
}