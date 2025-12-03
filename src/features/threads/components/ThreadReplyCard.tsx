import React from 'react';
import { ThreadReplyViewModel } from '../../../types/threads.types';
import { Avatar } from '../../../components/Avatar';
import { timeAgo } from '../../../utils/dateUtils';
import { ThumbsUp } from 'lucide-react';

interface ThreadReplyCardProps {
  reply: ThreadReplyViewModel;
}

export const ThreadReplyCard: React.FC<ThreadReplyCardProps> = ({ reply }) => {
  return (
    <div className="flex gap-4 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex-shrink-0">
        <Avatar src={reply.author.avatarUrl} alt={reply.author.displayName} size="md" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-gray-900">{reply.author.displayName}</span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-sm text-gray-500">{timeAgo(reply.createdAt)}</span>
        </div>

        <div className="text-gray-800 leading-relaxed mb-3">
          {reply.content}
        </div>

        <div className="flex items-center text-gray-500 text-sm">
          <button className="flex items-center space-x-1.5 hover:text-gray-900 transition-colors">
             <ThumbsUp className="w-4 h-4" />
             <span>{reply.reactionCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
