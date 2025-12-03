import React from 'react';
import { ThreadReplyViewModel } from '../../../types/threads.types';
import { ThreadReplyCard } from './ThreadReplyCard';

interface ThreadRepliesListProps {
  replies: ThreadReplyViewModel[];
}

export const ThreadRepliesList: React.FC<ThreadRepliesListProps> = ({ replies }) => {
  if (replies.length === 0) return null;

  return (
    <div className="space-y-4 mt-8">
      {replies.map(reply => (
        <ThreadReplyCard key={reply.id} reply={reply} />
      ))}
    </div>
  );
};
