
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar/Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { useLenser } from '../context/LenserContext';
import { CreateLenserProfileModal } from '../features/lenser/components/CreateLenserProfileModal';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { storage } from '../utils/storage';

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

const SIDEBAR_KEY = 'sidebar_collapsed';

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);

  const { lenser, hasLenser, isLoading: lenserLoading, updateLenserProfile } = useLenser();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [hasDismissedProfileModal, setHasDismissedProfileModal] = useState(false);

  // Initialize sidebar state from storage or defaults
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // 1. Mobile defaults to closed
    if (window.innerWidth < 1024) return false;
    
    // 2. Check storage
    const stored = storage.getItem(SIDEBAR_KEY);
    if (stored !== null) {
      // If stored is 'true', it means collapsed=true, so open=false
      return stored === 'false'; 
    }
    
    // 3. Default open on desktop
    return true;
  });

  // Sync sidebar state from Lenser Profile (DB) if local storage is missing/stale
  useEffect(() => {
    if (lenser?.preferences?.sidebar_collapsed !== undefined && !isMobile) {
      // If DB has a specific preference, use it to sync state (Open = !Collapsed)
      // Only apply if user hasn't explicitly interacted in this session? 
      // For now, we trust DB as source of truth on load if it exists.
      const dbSaysCollapsed = lenser.preferences.sidebar_collapsed;
      const localSaysCollapsed = storage.getItem(SIDEBAR_KEY) === 'true';
      
      // If they differ, or if local is null, prefer DB
      if (dbSaysCollapsed !== localSaysCollapsed) {
         setSidebarOpen(!dbSaysCollapsed);
         storage.setItem(SIDEBAR_KEY, dbSaysCollapsed.toString());
      }
    }
  }, [lenser?.preferences?.sidebar_collapsed, isMobile]);

  // Unified ready state - prevents race conditions
  const isReady = !authLoading && !lenserLoading;

  // Scroll reset on route change
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // Resize listener for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      if (mobile) {
        setSidebarOpen(false); // Force close on mobile
      } else {
        // Restore desktop preference on resize back to desktop
        const stored = storage.getItem(SIDEBAR_KEY);
        // If stored is 'true' (collapsed), open is false. 
        setSidebarOpen(stored !== 'true'); 
      }
    };

    handleResize();

    let timeoutId: any;
    const debounced = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debounced);
    return () => window.removeEventListener('resize', debounced);
  }, []);

  // Handle modal behavior only when data is ready
  useEffect(() => {
    if (!isReady) return;

    const shouldOpen =
      isAuthenticated &&
      !hasLenser &&
      !hasDismissedProfileModal;

    setIsProfileModalOpen(shouldOpen);
  }, [isReady, isAuthenticated, hasLenser, hasDismissedProfileModal]);

  const handleToggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    
    // Only persist preference if we are in desktop mode
    if (!isMobile) {
      const isCollapsed = !newState;
      storage.setItem(SIDEBAR_KEY, isCollapsed.toString());
      
      // Sync to DB if authenticated
      if (lenser) {
        const newPrefs = {
          ...(lenser.preferences || {}),
          sidebar_collapsed: isCollapsed
        };
        // Fire and forget update
        updateLenserProfile({ preferences: newPrefs }).catch(e => 
          console.warn("Failed to sync sidebar pref", e)
        );
      }
    }
  };

  const handleOpenProfileSetup = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setHasDismissedProfileModal(false);
    setIsProfileModalOpen(true);
  };

  const handleCloseProfileModal = () => {
    setHasDismissedProfileModal(true);
    setIsProfileModalOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors duration-200">
      <Sidebar
        isOpen={sidebarOpen}
        isMobile={isMobile}
        onCloseMobile={() => setSidebarOpen(false)}
        onOpenProfileSetup={handleOpenProfileSetup}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <Header
          onToggleSidebar={handleToggleSidebar}
          isSidebarOpen={sidebarOpen}
        />

        <main
          ref={mainContentRef}
          className="flex-1 overflow-y-auto scrollbar-hide flex flex-col"
        >
          <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-gray-900 dark:text-gray-100">
            {children || (
              <div className="text-gray-400 text-center mt-20">
                No content provided
              </div>
            )}
          </div>

          <Footer isDashboard={true} />
        </main>
      </div>

      {isProfileModalOpen && isAuthenticated && !hasLenser && isReady && (
        <CreateLenserProfileModal onClose={handleCloseProfileModal} />
      )}
    </div>
  );
};
