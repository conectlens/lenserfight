import React, { createContext, useContext, useState, useEffect } from 'react';
import { Lenser, CreateLenserDTO } from '../types/lenser.types';
import { lenserService } from '../services/lenserService';
import { useAuth } from './AuthContext';

interface LenserContextType {
  lenser: Lenser | null;
  hasLenser: boolean;
  isLoading: boolean;
  error: string | null;
  loadLenserProfile: () => Promise<void>;
  createLenserProfile: (data: CreateLenserDTO) => Promise<void>;
  updateLenserProfile: (data: Partial<Lenser>) => Promise<void>;
}

const LenserContext = createContext<LenserContextType | undefined>(undefined);

export const LenserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [lenser, setLenser] = useState<Lenser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLenserProfile = async () => {
    if (!user || !isAuthenticated) return;
    setIsLoading(true);
    try {
      const profile = await lenserService.getLenserProfile(user.id);
      setLenser(profile);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Automatically load profile when user authenticates
  useEffect(() => {
    if (isAuthenticated && user) {
      loadLenserProfile();
    } else {
      setLenser(null);
    }
  }, [isAuthenticated, user]);

  const createLenserProfile = async (data: CreateLenserDTO) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const newProfile = await lenserService.createLenserProfile(user.id, data);
      setLenser(newProfile);
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateLenserProfile = async (data: Partial<Lenser>) => {
      if (!user) return;
      // We don't set global loading here to avoid full page refresh flicker for small updates
      try {
          const updated = await lenserService.updateLenserProfile(user.id, data);
          setLenser(updated);
      } catch (err: any) {
          setError(err.message || 'Failed to update profile');
          throw err;
      }
  };

  const hasLenser = !!lenser;

  return (
    <LenserContext.Provider value={{ lenser, hasLenser, isLoading, error, loadLenserProfile, createLenserProfile, updateLenserProfile }}>
      {children}
    </LenserContext.Provider>
  );
};

export const useLenser = () => {
  const context = useContext(LenserContext);
  if (!context) throw new Error('useLenser must be used within LenserProvider');
  return context;
};