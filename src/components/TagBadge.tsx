import React from 'react';

interface TagBadgeProps {
  label: string;
  className?: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({ label, className = '' }) => {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 ${className}`}>
      #{label}
    </span>
  );
};
