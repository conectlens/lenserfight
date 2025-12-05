
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar/Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { useLenser } from '../context/LenserContext';
import { CreateLenserProfileModal } from '../features/lenser/components/CreateLenserProfileModal';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);

  const { hasLenser, isLoading: lenserLoading } = useLenser();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [hasDismissedProfileModal, setHasDismissedProfileModal] = useState(false);

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
      setSidebarOpen(!mobile);
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
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
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