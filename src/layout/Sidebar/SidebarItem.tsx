import React from 'react';

interface SidebarItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  collapsed?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon, 
  label, 
  isActive, 
  collapsed, 
  className = '', 
  ...props 
}) => {
  return (
    <button
      className={`
        w-full flex items-center p-3 my-1 rounded-xl transition-all duration-200 group
        ${isActive ? 'bg-primary/20 text-gray-900 font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
        ${className}
      `}
      title={collapsed ? label : undefined}
      {...props}
    >
      <span className={`flex-shrink-0 ${isActive ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-900'}`}>
        {icon}
      </span>
      
      {!collapsed && (
        <span className="ml-3 truncate">{label}</span>
      )}

      {isActive && !collapsed && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
      )}
    </button>
  );
};