import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar/Sidebar';
import { Header } from './Header';
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
  const { hasLenser, isLoading: lenserLoading } = useLenser();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Handle initial modal open state for authenticated users without profile
  useEffect(() => {
    if (isAuthenticated && !lenserLoading && !hasLenser) {
      setIsProfileModalOpen(true);
    }
  }, [isAuthenticated, lenserLoading, hasLenser]);

  // Responsive handler
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
    setIsProfileModalOpen(true);
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
       {/* Sidebar - Positioned left */}
       <Sidebar 
         isOpen={sidebarOpen} 
         isMobile={isMobile} 
         onCloseMobile={() => setSidebarOpen(false)}
         onOpenProfileSetup={handleOpenProfileSetup}
       />

       {/* Main Content Area - Flex Column */}
       <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          
          {/* Global Sticky Header */}
          <Header 
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            isSidebarOpen={sidebarOpen}
          />

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto scrollbar-hide p-4 lg:p-6 pb-20">
             <div className="max-w-7xl mx-auto w-full">
                {children || <div className="text-gray-400 text-center mt-20">No content provided</div>}
             </div>
          </main>

       </div>

       {isProfileModalOpen && isAuthenticated && !hasLenser && (
         <CreateLenserProfileModal onClose={() => setIsProfileModalOpen(false)} />
       )}
    </div>
  );
};