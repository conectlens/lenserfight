
import { getAuthRepository } from '../adapters/authAdapter';
import { User, AuthStateChangeCallback } from '../types/auth.types';

const authRepo = getAuthRepository();

export const authService = {
  login: async (email: string, password: string, captchaToken?: string): Promise<User> => {
    return authRepo.login(email, password, captchaToken);
  },

  register: async (email: string, password: string, metadata?: { display_name?: string }, captchaToken?: string): Promise<User> => {
    return authRepo.register(email, password, metadata, captchaToken);
  },

  logout: async (): Promise<void> => {
    return authRepo.logout();
  },

  getCurrentUser: async (): Promise<User | null> => {
    return authRepo.getCurrentUser();
  },

  requestPasswordReset: async (email: string, captchaToken?: string): Promise<void> => {
    return authRepo.requestPasswordReset(email, captchaToken);
  },

  resetPassword: async (password: string, token?: string): Promise<void> => {
    return authRepo.resetPassword(password, token);
  },

  signInWithOAuth: async (provider: 'google' | 'github' | 'azure'): Promise<void> => {
    return authRepo.signInWithOAuth(provider);
  },

  resendSignupConfirmation: async (email: string): Promise<void> => {
    return authRepo.resendSignupConfirmation(email);
  },

  onAuthStateChange: (callback: AuthStateChangeCallback): (() => void) => {
    return authRepo.onAuthStateChange(callback);
  }
};
