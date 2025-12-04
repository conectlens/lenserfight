
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThreadDetailViewModel } from '../../../types/threads.types';
import { Avatar } from '../../../components/Avatar';
import { timeAgo } from '../../../utils/dateUtils';
import { ThreadTagsBar } from './ThreadTagsBar';
import { ThreadReactionBar } from './ThreadReactionBar';
import { MentionRenderer } from '../../../components/MentionRenderer';

interface ThreadDetailCardProps {
  thread: ThreadDetailViewModel;
  onPromptClick?: (id: string) => void;
  onToggleReaction: () => void;
}

export const ThreadDetailCard: React.FC<ThreadDetailCardProps> = ({ thread, onToggleReaction }) => {
  const navigate = useNavigate();

  const handleAuthorClick = () => {
    navigate(`/lenser/${thread.author.handle}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div onClick={handleAuthorClick} className="cursor-pointer transition-opacity hover:opacity-80">
            <Avatar src={thread.author.avatarUrl} alt={thread.author.displayName} size="md" />
        </div>
        <div>
          <h3 
            onClick={handleAuthorClick} 
            className="text-base font-semibold text-gray-900 cursor-pointer hover:text-primary-700 transition-colors"
          >
            {thread.author.displayName}
          </h3>
          <p className="text-sm text-gray-500">{timeAgo(thread.createdAt)}</p>
        </div>
      </div>

      {/* Content */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
          {thread.title}
        </h1>
        <div className="text-base md:text-lg text-gray-800 leading-relaxed">
          <MentionRenderer content={thread.content} />
        </div>
      </div>

      {/* Footer: Tags & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-50">
        <ThreadTagsBar tags={thread.tags} />
        <ThreadReactionBar 
            count={thread.reactionCount} 
            hasReacted={thread.userHasReacted} 
            onReact={onToggleReaction}
        />
      </div>
    </div>
  );
};
