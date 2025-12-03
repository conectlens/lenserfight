
import { getAuthRepository } from '../adapters/authAdapter';
import { User } from '../types/auth.types';

const authRepo = getAuthRepository();

export const authService = {
  login: async (email: string, password: string): Promise<User> => {
    return authRepo.login(email, password);
  },

  register: async (email: string, password: string): Promise<User> => {
    return authRepo.register(email, password);
  },

  logout: async (): Promise<void> => {
    return authRepo.logout();
  },

  getCurrentUser: async (): Promise<User | null> => {
    return authRepo.getCurrentUser();
  },

  requestPasswordReset: async (email: string): Promise<void> => {
    return authRepo.requestPasswordReset(email);
  },

  resetPassword: async (password: string, token?: string): Promise<void> => {
    return authRepo.resetPassword(password, token);
  },

  signInWithOAuth: async (provider: 'google' | 'github' | 'azure'): Promise<void> => {
    return authRepo.signInWithOAuth(provider);
  }
};
