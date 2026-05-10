import React, { useEffect, useRef, createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { globalAnalyticsController } from '../controller';
import { GA4Provider } from '../providers/ga4';
import { PostHogProvider } from '../providers/posthog';
import { AnalyticsEvent } from '../types';

interface AnalyticsContextValue {
  trackEvent: (event: AnalyticsEvent) => void;
  trackBattleStart: (battleId: string) => void;
  trackSignup: (method: string) => void;
  trackFeedback: (type: string) => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue>({
  trackEvent: () => {},
  trackBattleStart: () => {},
  trackSignup: () => {},
  trackFeedback: () => {},
});

export const useAnalyticsApi = () => useContext(AnalyticsContext);

// Setup providers once
globalAnalyticsController.registerProvider(new GA4Provider());
globalAnalyticsController.registerProvider(new PostHogProvider());

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      globalAnalyticsController.init();
      initialized.current = true;
    }
  }, []);

  const api: AnalyticsContextValue = {
    trackEvent: (event) => globalAnalyticsController.trackEvent(event),
    trackBattleStart: (battleId) => globalAnalyticsController.trackEvent({ name: 'battle_start', properties: { battleId } }),
    trackSignup: (method) => globalAnalyticsController.trackEvent({ name: 'signup', properties: { method } }),
    trackFeedback: (type) => globalAnalyticsController.trackEvent({ name: 'feedback_submitted', properties: { type } }),
  };

  return (
    <AnalyticsContext.Provider value={api}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const RouteTracker: React.FC = () => {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const currentPath = location.pathname;
    if (lastPath.current === currentPath) return;
    lastPath.current = currentPath;

    globalAnalyticsController.trackPageView(currentPath);
  }, [location.pathname]);

  return null;
};
