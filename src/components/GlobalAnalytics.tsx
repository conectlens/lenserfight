
import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAnalytics';

export const GlobalAnalytics: React.FC = () => {
  const location = useLocation();
  const { trackView } = useAnalytics();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const currentPath = location.pathname;

    // Prevent duplicate logging for the same path (e.g., due to re-renders)
    if (lastPath.current === currentPath) return;
    lastPath.current = currentPath;

    // Check if this is a "Detail" page. 
    // If it is, the specific page component will handle the logging with the specific ID.
    // We only want to log "generic" pages (Home, Settings, Lists) here to avoid double counting.
    const isDetailPage = 
      currentPath.startsWith('/threads/') || 
      currentPath.startsWith('/prompts/') || 
      (currentPath.startsWith('/lenser/') && !currentPath.endsWith('/settings'));

    if (!isDetailPage) {
      trackView('page', undefined);
    }

  }, [location.pathname, trackView]);

  return null;
};
