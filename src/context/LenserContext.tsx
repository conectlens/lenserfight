
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Lenser, CreateLenserDTO } from '../types/lenser.types';
import { lenserService } from '../services/lenserService';
import { useAuth } from './AuthContext';
import { storage } from '../utils/storage';

const CACHE_KEY = 'lenser_profile_data_v1';

interface LenserContextType {
  lenser: Lenser | null;
  hasLenser: boolean;
  isLoading: boolean;
  error: string | null;
  loadLenserProfile: (force?: boolean) => Promise<void>;
  createLenserProfile: (data: CreateLenserDTO) => Promise<Lenser>;
  updateLenserProfile: (data: Partial<Lenser>) => Promise<Lenser>;
}

const LenserContext = createContext<LenserContextType | undefined>(undefined);

export const LenserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // 1. Initialize State synchronously from Storage to prevent flicker
  const [lenser, setLenser] = useState<Lenser | null>(() => {
    try {
      const cached = storage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      console.warn("Failed to parse cached lenser profile", e);
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2. Load Logic: Handles Cache hits, misses, and revalidation
  const loadLenserProfile = async (force = false) => {
    if (!user || !isAuthenticated) return;

    // 1. Memory Cache Hit
    // If state is already populated with the correct user data, avoid any further work
    if (!force && lenser && lenser.user_id === user.id) {
      return;
    }

    // 2. Storage Cache Hit (Double check)
    // Even if state wasn't ready, check storage again explicitly before network call
    if (!force) {
        try {
            const cachedStr = storage.getItem(CACHE_KEY);
            if (cachedStr) {
                const cachedProfile = JSON.parse(cachedStr) as Lenser;
                // Verify validity: must belong to the current authenticated user ID
                if (cachedProfile && cachedProfile.user_id === user.id) {
                    setLenser(cachedProfile);
                    return; // Skip fetch entirely
                }
            }
        } catch (e) {
            console.warn("Storage cache check failed", e);
            // Clean up potentially corrupt data
            storage.removeItem(CACHE_KEY);
        }
    }

    // 3. Network Fetch (Fallback)
    setIsLoading(true);
    setError(null);

    try {
      const profile = await lenserService.getLenserProfile(user.id);
      
      if (profile) {
        setLenser(profile);
        storage.setItem(CACHE_KEY, JSON.stringify(profile));
      } else {
        // User is authenticated but has no profile yet
        setLenser(null);
        storage.removeItem(CACHE_KEY);
      }
    } catch (err: any) {
      console.error('Profile load error:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. React to Auth Changes
  useEffect(() => {
    if (isAuthenticated && user) {
      // Trigger load logic (which now handles caching internally)
      loadLenserProfile();
    } else if (!isAuthenticated) {
      // Clear sensitive profile data on logout/unauth
      setLenser(null);
      storage.removeItem(CACHE_KEY);
    }
  }, [isAuthenticated, user?.id]);

  const createLenserProfile = async (data: CreateLenserDTO): Promise<Lenser> => {
    if (!user) throw new Error("User not authenticated");
    setIsLoading(true);
    try {
      const newProfile = await lenserService.createLenserProfile(user.id, data);
      
      // Update State & Cache
      setLenser(newProfile);
      storage.setItem(CACHE_KEY, JSON.stringify(newProfile));
      
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
      
      try {
          const updated = await lenserService.updateLenserProfile(user.id, data);
          
          // Optimistic / Immediate Update of State & Cache
          setLenser(updated);
          storage.setItem(CACHE_KEY, JSON.stringify(updated));
          
          return updated;
      } catch (err: any) {
          setError(err.message || 'Failed to update profile');
          throw err;
      }
  };

  const hasLenser = !!lenser;

  return (
    <LenserContext.Provider value={{ 
      lenser, 
      hasLenser, 
      isLoading, 
      error, 
      loadLenserProfile, 
      createLenserProfile, 
      updateLenserProfile 
    }}>
      {children}
    </LenserContext.Provider>
  );
};

export const useLenser = () => {
  const context = useContext(LenserContext);
  if (!context) throw new Error('useLenser must be used within LenserProvider');
  return context;
};
