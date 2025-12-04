
import React from 'react';
import { Lock } from 'lucide-react';

interface SidebarItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  collapsed?: boolean;
  isComingSoon?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon, 
  label, 
  isActive, 
  collapsed, 
  isComingSoon,
  className = '', 
  disabled,
  ...props 
}) => {
  return (
    <button
      className={`
        w-full flex items-center p-3 my-1 rounded-xl transition-all duration-200 group relative overflow-hidden
        ${isActive 
            ? 'bg-primary/20 text-gray-900 font-semibold' 
            : isComingSoon
                ? 'cursor-not-allowed opacity-60 hover:bg-transparent animate-pulse-gold'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }
        ${className}
      `}
      title={collapsed ? (isComingSoon ? "Coming Soon" : label) : undefined}
      disabled={disabled || isComingSoon}
      {...props}
    >
      {/* Shimmer Overlay for Coming Soon */}
      {isComingSoon && (
        <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-[50%] animate-shimmer-slide"></div>
        </div>
      )}

      <span className={`flex-shrink-0 z-10 relative ${isActive ? 'text-gray-900' : isComingSoon ? 'text-gray-400' : 'text-gray-500 group-hover:text-gray-900'}`}>
        {icon}
      </span>
      
      {!collapsed && (
        <div className="ml-3 flex-1 overflow-hidden flex items-center justify-between z-10 relative">
            <span className={`truncate ${isComingSoon ? 'blur-[2px] select-none text-gray-400 opacity-70' : ''}`}>
                {label}
            </span>
            {isComingSoon && (
                <Lock 
                    size={12} 
                    className="text-gray-400 opacity-20 ml-2 flex-shrink-0 drop-shadow-[0_0_2px_rgba(255,222,89,0.3)]" 
                />
            )}
        </div>
      )}

      {isActive && !collapsed && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
      )}
    </button>
  );
};
