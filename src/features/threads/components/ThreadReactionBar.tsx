import React from 'react';
import { ArrowUp } from 'lucide-react';

interface ThreadReactionBarProps {
  count: number;
  hasReacted: boolean;
  onReact: () => void;
  isLoading?: boolean;
}

export const ThreadReactionBar: React.FC<ThreadReactionBarProps> = ({ count, hasReacted, onReact, isLoading }) => {
  return (
    <div className="flex items-center space-x-2">
       <button 
         onClick={onReact}
         disabled={isLoading}
         className={`
           flex items-center space-x-1.5 px-4 py-1.5 rounded-full border transition-all duration-200
           ${hasReacted 
             ? 'bg-primary border-primary text-gray-900 shadow-sm' 
             : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'}
           disabled:opacity-70 disabled:cursor-not-allowed
         `}
       >
         <ArrowUp className={`w-4 h-4 ${hasReacted ? 'stroke-[3px]' : ''}`} />
         <span className="text-sm font-bold">{count}</span>
       </button>
       <span className="text-sm text-gray-500 font-medium ml-2">Upvote</span>
    </div>
  );
};
