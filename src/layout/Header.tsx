
import React, { useState } from 'react';
import { Menu, MoreHorizontal, Share2 } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { useShareContext } from '../context/ShareContext';
import { ShareModal } from '../components/ShareModal';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { shareConfig } = useShareContext();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-gray-50/95 backdrop-blur-sm transition-all duration-200 w-full">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button 
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
        
        <Breadcrumbs />
      </div>

      <div className="flex items-center flex-shrink-0 pl-2 gap-1">
        {shareConfig && (
          <button 
              onClick={() => setIsShareModalOpen(true)}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-900 transition-colors"
              aria-label="Share"
              title="Share"
          >
              <Share2 size={20} />
          </button>
        )}
        <button 
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-900 transition-colors"
            aria-label="Page Options"
        >
            <MoreHorizontal size={20} />
        </button>
      </div>

      {shareConfig && (
        <ShareModal 
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            title={shareConfig.title}
            resourceType={shareConfig.resourceType}
            resourceId={shareConfig.resourceId}
            slug={shareConfig.slug}
        />
      )}
    </header>
  );
};
