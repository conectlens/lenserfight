
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
  const { hasLenser, isLoading: lenserLoading } = useLenser();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mainContentRef = useRef<HTMLElement>(null);

  // Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [hasDismissedProfileModal, setHasDismissedProfileModal] = useState(false);

  // Scroll Reset for Dashboard Container
  useEffect(() => {
    if (mainContentRef.current) {
        mainContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isAuthenticated && !lenserLoading && !hasLenser && !hasDismissedProfileModal) {
      setIsProfileModalOpen(true);
    }
  }, [isAuthenticated, lenserLoading, hasLenser, hasDismissedProfileModal]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
          setSidebarOpen(false);
      } else {
          setSidebarOpen(true);
      }
    };
    
    handleResize();
    
    let timeoutId: any;
    const debouncedResize = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    return () => window.removeEventListener('resize', debouncedResize);
  }, []);

  const handleOpenProfileSetup = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setHasDismissedProfileModal(false);
    setIsProfileModalOpen(true);
  };

  const handleCloseProfileModal = () => {
      setIsProfileModalOpen(false);
      setHasDismissedProfileModal(true);
  };

  if (authLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
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

          <main ref={mainContentRef} className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">
             {/* Unified Container Layout - The Single Source of Truth for Page Margins */}
             <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children || <div className="text-gray-400 text-center mt-20">No content provided</div>}
             </div>
             <Footer isDashboard={true} />
          </main>

       </div>

       {isProfileModalOpen && isAuthenticated && !hasLenser && (
         <CreateLenserProfileModal onClose={handleCloseProfileModal} />
       )}
    </div>
  );
};
