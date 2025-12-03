import React from 'react';
import { ThreadDetailViewModel } from '../../../types/threads.types';
import { Avatar } from '../../../components/Avatar';
import { timeAgo } from '../../../utils/dateUtils';
import { ThreadPromptCard } from './ThreadPromptCard';
import { ThreadTagsBar } from './ThreadTagsBar';
import { ThreadReactionBar } from './ThreadReactionBar';

interface ThreadDetailCardProps {
  thread: ThreadDetailViewModel;
}

export const ThreadDetailCard: React.FC<ThreadDetailCardProps> = ({ thread }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar src={thread.author.avatarUrl} alt={thread.author.displayName} size="md" />
        <div>
          <h3 className="text-base font-semibold text-gray-900">{thread.author.displayName}</h3>
          <p className="text-sm text-gray-500">{timeAgo(thread.createdAt)}</p>
        </div>
      </div>

      {/* Content */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
          {thread.title}
        </h1>
        <div className="text-base text-gray-800 leading-relaxed whitespace-pre-line">
          {thread.content}
        </div>
      </div>

      {/* Optional Prompt Block */}
      {thread.promptBlock && (
        <ThreadPromptCard data={thread.promptBlock} />
      )}

      {/* Footer: Tags & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8 pt-6">
        <ThreadTagsBar tags={thread.tags} />
        <ThreadReactionBar count={thread.reactionCount} />
      </div>
    </div>
  );
};
