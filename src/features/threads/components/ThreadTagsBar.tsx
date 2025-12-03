import React from 'react';
import { TagRecord } from '../../../types/threads.types';

interface ThreadTagsBarProps {
  tags: TagRecord[];
}

export const ThreadTagsBar: React.FC<ThreadTagsBarProps> = ({ tags }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => (
        <span 
          key={tag.id} 
          className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
};
