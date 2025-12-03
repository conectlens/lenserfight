import React from 'react';
import { TagRecord } from '../../../types/threads.types';

interface PromptTagsBarProps {
  tags: TagRecord[];
}

export const PromptTagsBar: React.FC<PromptTagsBarProps> = ({ tags }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => (
        <span 
          key={tag.id} 
          className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-700"
        >
          #{tag.name}
        </span>
      ))}
    </div>
  );
};
