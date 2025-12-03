
import React from 'react';
import { ThreadReplyViewModel } from '../../../types/threads.types';
import { ThreadReplyCard } from './ThreadReplyCard';

interface ThreadRepliesListProps {
  replies: ThreadReplyViewModel[];
  onReplySubmit: (content: string, parentId: string) => Promise<void>;
  onReactionToggle?: (replyId: string) => void;
}

export const ThreadRepliesList: React.FC<ThreadRepliesListProps> = ({ replies, onReplySubmit, onReactionToggle }) => {
  if (replies.length === 0) return null;

  return (
    <div className="space-y-2 mt-8">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 px-2">
          {replies.length} {replies.length === 1 ? 'Comment' : 'Comments'}
      </h3>
      {replies.map(reply => (
        <ThreadReplyCard 
            key={reply.id} 
            reply={reply} 
            onReplySubmit={onReplySubmit}
            onReactionToggle={onReactionToggle}
        />
      ))}
    </div>
  );
};
