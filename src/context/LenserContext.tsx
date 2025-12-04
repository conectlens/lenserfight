
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Lenser, CreateLenserDTO } from '../types/lenser.types';
import { lenserService } from '../services/lenserService';
import { useAuth } from './AuthContext';
import { storage } from '../utils/storage';

const PROFILE_CACHE_KEY = 'lenser_has_profile';

interface LenserContextType {
  lenser: Lenser | null;
  hasLenser: boolean;
  isLoading: boolean;
  error: string | null;
  cachedProfileExists: boolean;
  loadLenserProfile: () => Promise<void>;
  createLenserProfile: (data: CreateLenserDTO) => Promise<Lenser>;
  updateLenserProfile: (data: Partial<Lenser>) => Promise<Lenser>;
}

const LenserContext = createContext<LenserContextType | undefined>(undefined);

export const LenserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [lenser, setLenser] = useState<Lenser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize from storage to prevent modal flicker on reload
  const [cachedProfileExists, setCachedProfileExists] = useState(() => {
      return storage.getItem(PROFILE_CACHE_KEY) === 'true';
  });

  const loadLenserProfile = async () => {
    if (!user || !isAuthenticated) return;
    setIsLoading(true);
    try {
      const profile = await lenserService.getLenserProfile(user.id);
      setLenser(profile);
      
      // Update cache
      if (profile) {
          storage.setItem(PROFILE_CACHE_KEY, 'true');
          setCachedProfileExists(true);
      } else {
          storage.removeItem(PROFILE_CACHE_KEY);
          setCachedProfileExists(false);
      }
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
      // We don't clear cache here on simple unmount/auth-check fail to preserve it for reloads, 
      // explicitly clear on logout in AuthContext instead.
    }
  }, [isAuthenticated, user]);

  const createLenserProfile = async (data: CreateLenserDTO): Promise<Lenser> => {
    if (!user) throw new Error("User not authenticated");
    setIsLoading(true);
    try {
      const newProfile = await lenserService.createLenserProfile(user.id, data);
      setLenser(newProfile);
      
      // Update cache
      storage.setItem(PROFILE_CACHE_KEY, 'true');
      setCachedProfileExists(true);
      
      return newProfile;
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateLenserProfile = async (data: Partial<Lenser>): Promise<Lenser> => {
      if (!user) throw new Error("User not authenticated");
      // We don't set global loading here to avoid full page refresh flicker for small updates
      try {
          const updated = await lenserService.updateLenserProfile(user.id, data);
          setLenser(updated);
          return updated;
      } catch (err: any) {
          setError(err.message || 'Failed to update profile');
          throw err;
      }
  };

  const hasLenser = !!lenser;

  return (
    <LenserContext.Provider value={{ lenser, hasLenser, isLoading, error, cachedProfileExists, loadLenserProfile, createLenserProfile, updateLenserProfile }}>
      {children}
    </LenserContext.Provider>
  );
};

export const useLenser = () => {
  const context = useContext(LenserContext);
  if (!context) throw new Error('useLenser must be used within LenserProvider');
  return context;
};
