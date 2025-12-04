import React from 'react';

interface PromptsTagFilterProps {
  selectedTag: string | null;
  onSelect: (tag: string | null) => void;
}

const FILTERS = [
  { label: 'All', value: null },
  { label: 'Productivity', value: 'productivity' },
  { label: 'Creative Writing', value: 'writing' },
  { label: 'Marketing', value: 'marketing' },
  { label: 'Development', value: 'development' },
  { label: 'Mindfulness', value: 'mindfulness' }
];

export const PromptsTagFilter: React.FC<PromptsTagFilterProps> = ({ selectedTag, onSelect }) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide w-full max-w-full touch-pan-x">
      {FILTERS.map(filter => (
        <button
          key={filter.label}
          onClick={() => onSelect(filter.value)}
          className={`
            px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
            ${selectedTag === filter.value 
                ? 'bg-gray-900 text-white shadow-sm' 
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}
          `}
        >
          {filter.label === 'All' ? filter.label : `#${filter.label}`}
        </button>
      ))}
    </div>
  );
};