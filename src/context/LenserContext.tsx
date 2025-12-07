import React, { createContext, useContext, useState, useEffect } from 'react';
import { Lenser, CreateLenserDTO } from '../types/lenser.types';
import { lenserService } from '../services/lenserService';
import { useAuth } from './AuthContext';
import { storage } from '../utils/storage';
import { xpService } from '../services/xpService';

const CACHE_BASE_KEY = 'lenser_profile_cache_v1';
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 dakika: profil 5 dk boyunca "taze" kabul edilir

interface LenserCacheEntry {
  userId: string;
  profile: Lenser;
  fetchedAt: number; // Date.now()
}

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

const getCacheKey = (userId: string) => `${CACHE_BASE_KEY}_${userId}`;

const readCachedProfile = (userId: string): LenserCacheEntry | null => {
  try {
    const raw = storage.getItem(getCacheKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as LenserCacheEntry;

    // Kullanıcıya ait olmayan / bozuk cache'i yok say
    if (!parsed || parsed.userId !== userId || !parsed.profile || !parsed.profile.id) {
      return null;
    }

    return parsed;
  } catch (e) {
    console.warn('Failed to parse lenser cache', e);
    return null;
  }
};

const writeCachedProfile = (userId: string, profile: Lenser) => {
  try {
    const safeProfile: Lenser = {
      ...profile,
      // localStorage içeriği manipüle edilse bile user_id her zaman auth user ile eşitleniyor
      user_id: userId,
    };

    const entry: LenserCacheEntry = {
      userId,
      profile: safeProfile,
      fetchedAt: Date.now(),
    };

    storage.setItem(getCacheKey(userId), JSON.stringify(entry));
  } catch (e) {
    console.warn('Failed to write lenser cache', e);
  }
};

const clearCache = (userId: string | null | undefined) => {
  try {
    if (!userId) return;
    storage.removeItem(getCacheKey(userId));
  } catch {
    // ignore
  }
};

export const LenserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [lenser, setLenser] = useState<Lenser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Günlük XP yalnızca günde bir kez
  const checkAndGrantDailyLogin = async (lenserId: string) => {
    const key = `lenser_daily_login_${lenserId}`;
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = storage.getItem(key);

    if (lastLogin !== today) {
      try {
        await xpService.notifyDailyLogin(lenserId);
        storage.setItem(key, today);
      } catch (err) {
        console.warn('XP Daily Login failed', err);
      }
    }
  };

  const loadLenserProfile = async (force = false): Promise<void> => {
    if (!user || !isAuthenticated) return;

    const userId = user.id;

    // 1) Bellek: doğru kullanıcıya ait profil varsa ve force değilse direkt kullan
    if (!force && lenser && lenser.user_id === userId) {
      return;
    }

    // 2) localStorage cache: TTL kontrolü ile
    const cached = readCachedProfile(userId);

    if (!force && cached) {
      const age = Date.now() - cached.fetchedAt;
      const isFresh = age < CACHE_TTL_MS;

      // Manipülasyon riskine karşı user_id'yi Auth ile zorla
      const safeProfile: Lenser = {
        ...cached.profile,
        user_id: userId,
      };

      setLenser(safeProfile);

      // Günlük XP (id bazlı olduğu için tekrar çağrı olsa bile guard var)
      checkAndGrantDailyLogin(safeProfile.id);

      // Cache taze ise DB'ye gitmeye gerek yok
      if (isFresh) {
        return;
      }

      // Stale-while-revalidate:
      // Kullanıcı hemen cache'i görür, arka planda sessizce revalidate edeceğiz
    }

    // 3) Network: cache yoksa ya da stale ise
    setIsLoading(true);
    setError(null);

    try {
      const profile = await lenserService.getLenserProfile(userId);

      if (profile) {
        const safeProfile: Lenser = {
          ...profile,
          user_id: userId, // Sunucudan da gelse user_id'yi Auth'a sabitliyoruz
        };

        setLenser(safeProfile);
        writeCachedProfile(userId, safeProfile);
        checkAndGrantDailyLogin(safeProfile.id);
      } else {
        // Auth var ama henüz lenser profili yok
        setLenser(null);
        clearCache(userId);
      }
    } catch (err: any) {
      console.error('Profile load error:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Auth değişimlerine tepki
  useEffect(() => {
    if (isAuthenticated && user) {
      const userId = user.id;

      // İlk anda: blocking yapmadan cache'i oku
      const cached = readCachedProfile(userId);
      if (cached) {
        const safeProfile: Lenser = {
          ...cached.profile,
          user_id: userId,
        };
        setLenser(safeProfile);
        checkAndGrantDailyLogin(safeProfile.id);
      } else {
        setLenser(null);
      }

      // Ardından revalidation (TTL uygunsa DB’ye dokunmadan dönebilir)
      loadLenserProfile();
    } else {
      // Logout / unauth durumunda profil ve cache'i temizle
      if (user?.id) {
        clearCache(user.id);
      }
      setLenser(null);
      setError(null);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  const createLenserProfile = async (data: CreateLenserDTO): Promise<Lenser> => {
    if (!user) throw new Error('User not authenticated');

    const userId = user.id;
    setIsLoading(true);

    try {
      const newProfile = await lenserService.createLenserProfile(userId, data);

      const safeProfile: Lenser = {
        ...newProfile,
        user_id: userId,
      };

      setLenser(safeProfile);
      writeCachedProfile(userId, safeProfile);
      checkAndGrantDailyLogin(safeProfile.id);

      return safeProfile;
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateLenserProfile = async (data: Partial<Lenser>): Promise<Lenser> => {
    if (!lenser) throw new Error('Lenser profile not found');
    if (!user) throw new Error('User not authenticated');

    const userId = user.id;

    try {
      const updated = await lenserService.updateLenserProfile(lenser.handle, data);

      const safeProfile: Lenser = {
        ...updated,
        user_id: userId,
      };

      setLenser(safeProfile);
      writeCachedProfile(userId, safeProfile);

      return safeProfile;
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      throw err;
    }
  };

  const hasLenser = !!lenser;

  return (
    <LenserContext.Provider
      value={{
        lenser,
        hasLenser,
        isLoading,
        error,
        loadLenserProfile,
        createLenserProfile,
        updateLenserProfile,
      }}
    >
      {children}
    </LenserContext.Provider>
  );
};

export const useLenser = () => {
  const context = useContext(LenserContext);
  if (!context) throw new Error('useLenser must be used within LenserProvider');
  return context;
};