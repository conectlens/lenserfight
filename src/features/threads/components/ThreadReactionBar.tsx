import React from 'react';
import { ArrowUp } from 'lucide-react';

interface ThreadReactionBarProps {
  count: number;
}

export const ThreadReactionBar: React.FC<ThreadReactionBarProps> = ({ count }) => {
  return (
    <div className="flex items-center space-x-2">
       <button className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
         <ArrowUp className="w-4 h-4" />
         <span className="text-sm font-medium">{count}</span>
       </button>
    </div>
  );
};
