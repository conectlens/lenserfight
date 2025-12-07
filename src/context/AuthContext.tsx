
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '../types/auth.types';
import { authService } from '../services/authService';
import { storage } from '../utils/storage';
import { queryClient } from '../lib/react-query';

interface AuthContextType extends AuthState {
  login: (email: string, pass: string, captchaToken?: string) => Promise<void>;
  register: (email: string, pass: string, displayName?: string, captchaToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string, captchaToken?: string) => Promise<void>;
  resetPassword: (password: string, token?: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github' | 'azure') => Promise<void>;
  resendSignupConfirmation: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred';
};

// Key used in LenserContext
const LENSER_CACHE_KEY = 'lenser_profile_data_v1';
const MOCK_AUTH_KEY = 'mock_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    // 1. Initial Load from persisted session or repo
    const initAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setState(s => ({ ...s, user, isAuthenticated: true, isLoading: false }));
        } else {
          setState(s => ({ ...s, user: null, isAuthenticated: false, isLoading: false }));
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setState(s => ({ ...s, isLoading: false, error: 'Failed to restore session' }));
      }
    };
    initAuth();

    // 2. Subscribe to auth state changes (Supabase specific events like token refresh)
    const unsubscribe = authService.onAuthStateChange((user) => {
      setState(s => {
        // Prevent state updates if user object is identical (by ID) to avoid downstream re-renders
        if (s.user?.id === user?.id) return s;
        return {
          ...s,
          user,
          isAuthenticated: !!user,
          isLoading: false
        };
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string, captchaToken?: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const user = await authService.login(email, pass, captchaToken);
      setState({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setState(s => ({ ...s, isLoading: false, error: message }));
      throw err;
    }
  };

  const register = async (email: string, pass: string, displayName?: string, captchaToken?: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const user = await authService.register(email, pass, displayName ? { display_name: displayName } : undefined, captchaToken);
      setState({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setState(s => ({ ...s, isLoading: false, error: message }));
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error("Logout error", e);
    }
    
    // 1. Clear React Query Cache (Removes all cached API responses)
    queryClient.clear();

    // 2. Clear Local Storage / Persisted State
    storage.removeItem('lenser_has_profile');
    storage.removeItem(LENSER_CACHE_KEY);
    storage.removeItem(MOCK_AUTH_KEY);
    
    // 3. Reset Local State
    setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
  };

  const requestPasswordReset = async (email: string, captchaToken?: string) => {
    try {
      await authService.requestPasswordReset(email, captchaToken);
    } catch (err: unknown) {
      throw err;
    }
  };

  const resetPassword = async (password: string, token?: string) => {
    try {
      await authService.resetPassword(password, token);
    } catch (err: unknown) {
      throw err;
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github' | 'azure') => {
    try {
      await authService.signInWithOAuth(provider);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setState(s => ({ ...s, error: message }));
      throw err;
    }
  };

  const resendSignupConfirmation = async (email: string) => {
    try {
      await authService.resendSignupConfirmation(email);
    } catch (err: unknown) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, requestPasswordReset, resetPassword, signInWithOAuth, resendSignupConfirmation }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
