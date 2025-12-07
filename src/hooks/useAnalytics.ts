
import { useCallback } from 'react';
import { analyticsService } from '../services/analyticsService';
import { useAuth } from '../context/AuthContext';
import { useLenser } from '../context/LenserContext';
import { TargetType } from '../types/analytics.types';

export const useAnalytics = () => {
  const { user } = useAuth();
  const { lenser } = useLenser();

  const trackView = useCallback((targetType: TargetType, targetId?: string) => {
    analyticsService.trackView(targetType, targetId, {
      userId: user?.id,
      lenserId: lenser?.id
    });
  }, [user?.id, lenser?.id]);

  return { trackView };
};
