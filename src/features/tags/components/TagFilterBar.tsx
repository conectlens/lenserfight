
import React from 'react';
import { SortOption } from '../../../types/tags.types';
import { SlidersHorizontal } from 'lucide-react';

interface TagFilterBarProps {
  filters: { value: string; label: string }[];
  activeFilter: string;
  onFilterChange: (val: any) => void;
  activeSort: SortOption;
  onSortChange: (val: SortOption) => void;
}

export const TagFilterBar: React.FC<TagFilterBarProps> = ({ 
  filters, 
  activeFilter, 
  onFilterChange, 
  activeSort, 
  onSortChange 
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 z-20 bg-gray-50/95 backdrop-blur py-3 border-b border-gray-100/50">
       {/* Tabs */}
       <div className="flex p-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto scrollbar-hide max-w-full">
          {filters.map(f => (
              <button
                 key={f.value}
                 onClick={() => onFilterChange(f.value)}
                 className={`
                    px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap
                    ${activeFilter === f.value 
                        ? 'bg-gray-900 text-white shadow-sm' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}
                 `}
              >
                  {f.label}
              </button>
          ))}
       </div>

       {/* Sort */}
       <div className="relative inline-flex items-center">
          <SlidersHorizontal className="absolute left-3 w-4 h-4 text-gray-500 pointer-events-none" />
          <select
            value={activeSort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-9 pr-10 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
          >
            <option value="trending">Trending</option>
            <option value="popular">Popular</option>
            <option value="newest">Newest</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
             <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
             </svg>
          </div>
       </div>
    </div>
  );
};
