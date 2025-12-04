
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface Tab {
  label: string;
  path: string;
}

interface PublicPageTabsProps {
  tabs: Tab[];
}

export const PublicPageTabs: React.FC<PublicPageTabsProps> = ({ tabs }) => {
  const location = useLocation();

  return (
    <div className="border-b border-gray-100 sticky top-20 z-30 bg-white/95 backdrop-blur-sm transition-all duration-200">
      <div className="max-w-5xl mx-auto px-6 flex gap-8 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`
                py-4 text-sm font-semibold transition-all relative whitespace-nowrap
                ${isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}
              `}
            >
              {tab.label}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full animate-in fade-in zoom-in-x duration-300"></div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
