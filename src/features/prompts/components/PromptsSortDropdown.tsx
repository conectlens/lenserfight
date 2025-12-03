import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

interface PromptsSortDropdownProps {
  value: 'newest' | 'popular';
  onChange: (val: 'newest' | 'popular') => void;
}

export const PromptsSortDropdown: React.FC<PromptsSortDropdownProps> = ({ value, onChange }) => {
  return (
    <div className="relative inline-flex items-center">
      <SlidersHorizontal className="absolute left-3 w-4 h-4 text-gray-500 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as any)}
        className="appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pl-9 pr-8 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
      >
        <option value="newest">Newest</option>
        <option value="popular">Popular</option>
      </select>
    </div>
  );
};
