
import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar/Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { useLenser } from '../context/LenserContext';
import { CreateLenserProfileModal } from '../features/lenser/components/CreateLenserProfileModal';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { hasLenser, isLoading: lenserLoading, cachedProfileExists } = useLenser();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [hasDismissedProfileModal, setHasDismissedProfileModal] = useState(false);

  useEffect(() => {
    // Suppress modal if we know from cache that profile exists
    if (cachedProfileExists) return;

    if (isAuthenticated && !lenserLoading && !hasLenser && !hasDismissedProfileModal) {
      setIsProfileModalOpen(true);
    }
  }, [isAuthenticated, lenserLoading, hasLenser, hasDismissedProfileModal, cachedProfileExists]);

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

          <main className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">
             {/* Unified Container Layout - The Single Source of Truth for Page Margins */}
             <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children || <div className="text-gray-400 text-center mt-20">No content provided</div>}
             </div>
             <Footer />
          </main>

       </div>

       {isProfileModalOpen && isAuthenticated && !hasLenser && !cachedProfileExists && (
         <CreateLenserProfileModal onClose={handleCloseProfileModal} />
       )}
    </div>
  );
};
