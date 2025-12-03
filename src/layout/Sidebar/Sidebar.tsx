import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SidebarItem } from './SidebarItem';
import { useLenser } from '../../context/LenserContext';
import { FeedbackModal } from '../../features/feedback/components/FeedbackModal';
import { 
  Home, 
  Compass, 
  MoreHorizontal,
  Settings,
  LifeBuoy,
  LogOut,
  Lightbulb,
  User,
  Sparkles,
  MessageSquarePlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  onCloseMobile: () => void;
  onOpenProfileSetup: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, isMobile, onCloseMobile, onOpenProfileSetup }) => {
  const { lenser } = useLenser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Feedback Modal State
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isDropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);
  
  // Desktop: Sticky column
  const desktopWidthClass = isOpen ? 'w-64' : 'w-20';
  
  // Added 'flex flex-col' to ensure spacing works correctly
  const containerClass = isMobile
    ? `fixed inset-y-0 left-0 h-full w-64 bg-gray-50 z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
    : `sticky top-0 h-screen flex-shrink-0 bg-gray-50 border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col ${desktopWidthClass}`;

  const showOverlay = isMobile && isOpen;

  const handleLogoClick = () => {
    navigate('/app');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) onCloseMobile();
  };
  
  const handleProfileClick = () => {
    if (lenser?.handle) {
        handleNavigation(`/lenser/${lenser.handle}`);
    } else {
        onOpenProfileSetup();
    }
    if (isMobile) onCloseMobile();
  };

  // Helper to determine if we show text labels
  const showLabels = isOpen || isMobile;

  return (
    <>
      {showOverlay && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" 
          onClick={onCloseMobile}
        />
      )}

      <aside className={containerClass}>
        {/* Header / Logo */}
        <div className={`h-16 flex items-center px-4 flex-shrink-0 ${!showLabels ? 'justify-center' : ''}`}>
          <div 
            className="flex items-center gap-3 cursor-pointer group w-full"
            onClick={handleLogoClick}
            title="Go Home"
          >
            <div className={`w-8 h-8 rounded-lg bg-yellow-300 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105`}>
               <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="6" strokeWidth="2" />
               </svg>
            </div>
            {showLabels && <span className="font-bold text-lg tracking-tight text-gray-900 truncate">ConnectLens</span>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide flex flex-col">
           <SidebarItem 
             onClick={() => handleNavigation('/app')}
             icon={<Home size={20} />} 
             label="Home" 
             isActive={location.pathname === '/app'} 
             collapsed={!showLabels} 
           />
           
           <SidebarItem 
             onClick={() => handleNavigation('/prompts')}
             icon={<Lightbulb size={20} />} 
             label="Prompts" 
             isActive={location.pathname.startsWith('/prompts')} 
             collapsed={!showLabels} 
           />
           
           <SidebarItem 
             onClick={handleProfileClick}
             icon={<User size={20} />} 
             label="Profile" 
             isActive={lenser ? location.pathname === `/lenser/${lenser.handle}` : false} 
             collapsed={!showLabels} 
           />

           <SidebarItem icon={<Compass size={20} />} label="Explore" collapsed={!showLabels} />
        </nav>

        {/* Footer: Feedback Button & User Profile */}
        <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-gray-200 bg-gray-50 mt-auto">
          
          {/* Feedback Button - Pinned above user */}
          <div className="mb-2">
              <SidebarItem 
                onClick={() => setIsFeedbackOpen(true)}
                icon={<MessageSquarePlus size={20} />} 
                label="Send Feedback" 
                isActive={false} 
                collapsed={!showLabels}
                className="text-gray-500 hover:text-primary-700 hover:bg-yellow-50"
              />
          </div>

          <div className="relative">
            <div 
              className={`
                  flex items-center p-2 rounded-xl transition-all 
                  ${!lenser ? 'filter blur-sm select-none opacity-60' : 'hover:bg-white hover:shadow-sm cursor-pointer border border-transparent hover:border-gray-100'}
                  ${!showLabels ? 'justify-center' : ''}
              `}
            >
               <div className="relative flex-shrink-0" onClick={lenser ? handleProfileClick : undefined}>
                  <img 
                    src={lenser?.avatar_url || "https://ui-avatars.com/api/?name=Guest&background=random"} 
                    alt="Avatar" 
                    className="w-9 h-9 rounded-full object-cover bg-gray-200" 
                  />
                  {lenser && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>}
               </div>
               
               {showLabels && (
                 <div className="ml-3 flex-1 overflow-hidden" onClick={lenser ? handleProfileClick : undefined}>
                   <p className="text-sm font-semibold text-gray-900 truncate">{lenser?.display_name || "Guest"}</p>
                   <p className="text-xs text-gray-500 truncate">@{lenser?.handle || "guest"}</p>
                 </div>
               )}
               
               {showLabels && lenser && (
                 <div className="relative">
                   <button 
                      ref={buttonRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDropdownOpen(!isDropdownOpen);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${isDropdownOpen ? 'bg-gray-200 text-gray-900' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
                   >
                      <MoreHorizontal size={18} />
                   </button>

                   {isDropdownOpen && (
                     <div 
                        ref={dropdownRef}
                        className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 z-50 overflow-hidden transform origin-bottom-right"
                        onClick={(e) => e.stopPropagation()}
                     >
                       <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</p>
                       </div>
                       <div className="p-1">
                         <button 
                           className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-3 transition-colors"
                           onClick={() => setIsDropdownOpen(false)}
                         >
                           <Settings size={16} className="text-gray-400" />
                           Settings
                         </button>
                         <button 
                           className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-3 transition-colors"
                           onClick={() => setIsDropdownOpen(false)}
                         >
                           <LifeBuoy size={16} className="text-gray-400" />
                           Help & Support
                         </button>
                       </div>
                       <div className="h-px bg-gray-100 my-0"></div>
                       <div className="p-1">
                          <button 
                              onClick={() => {
                                setIsDropdownOpen(false);
                                logout();
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                          >
                            <LogOut size={16} />
                            Logout
                          </button>
                       </div>
                     </div>
                   )}
                 </div>
               )}
            </div>

            {/* CTA Overlay when no Lenser Profile */}
            {!lenser && (
              <div className="absolute inset-0 flex items-center justify-center p-2 z-10 bg-gray-50/50 backdrop-blur-[1px]">
                   <button 
                      onClick={onOpenProfileSetup}
                      className={`
                          flex items-center justify-center gap-2 bg-primary hover:bg-yellow-300 text-gray-900 font-bold rounded-xl shadow-lg transition-all w-full h-10
                          ${!showLabels ? 'rounded-full w-10 p-0' : 'px-4'}
                      `}
                      title="Be a Lenser"
                   >
                      <Sparkles size={18} />
                      {showLabels && <span>Join</span>}
                   </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Global Feedback Modal */}
      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
      />
    </>
  );
};