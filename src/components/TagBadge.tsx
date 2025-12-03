import React from 'react';

interface TagBadgeProps {
  label: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const TagBadge: React.FC<TagBadgeProps> = ({ label, className = '', onClick }) => {
  const interactiveClasses = onClick 
    ? "cursor-pointer hover:bg-gray-200 hover:text-gray-900 transition-colors" 
    : "";

  return (
    <span 
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 ${interactiveClasses} ${className}`}
    >
      #{label}
    </span>
  );
};