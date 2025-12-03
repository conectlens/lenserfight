import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/Card';
import { Avatar } from '../../../components/Avatar';
import { TagBadge } from '../../../components/TagBadge';
import { ThreadFeedItem } from '../../../types/threads.types';
import { timeAgo } from '../../../utils/dateUtils';
import { ThumbsUp, MessageSquare } from 'lucide-react';

interface ThreadsListCardProps {
  thread: ThreadFeedItem;
  onOpen: (id: string) => void;
}

export const ThreadsListCard: React.FC<ThreadsListCardProps> = ({ thread, onOpen }) => {
  const navigate = useNavigate();

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/lenser/${thread.author.handle}`);
  };

  return (
    <div onClick={() => onOpen(thread.id)} className="cursor-pointer group">
      <Card className="hover:shadow-md transition-all duration-200 border-gray-200 group-hover:border-primary/40">
        <div className="flex items-start gap-4">
          {/* Author Avatar */}
          <div onClick={handleUserClick} className="flex-shrink-0 hover:opacity-80 transition-opacity z-10">
             <Avatar src={thread.author.avatarUrl} alt={thread.author.displayName} size="md" />
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Header: Name and Time */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span 
                    onClick={handleUserClick}
                    className="text-base font-semibold text-gray-900 hover:underline hover:text-deep cursor-pointer z-10"
                >
                    {thread.author.displayName}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <p className="text-xs text-gray-500">{timeAgo(thread.createdAt)}</p>
              </div>
            </div>

            {/* Thread Title */}
            <h2 className="text-xl font-bold text-gray-900 mb-2 leading-tight group-hover:text-deep transition-colors">
              {thread.title}
            </h2>

            {/* Content Preview */}
            <p className="text-gray-600 mb-4 line-clamp-3 leading-relaxed">
              {thread.content}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {thread.tags.map(tag => (
                <TagBadge key={tag.id} label={tag.name} />
              ))}
            </div>

            {/* Footer: Reactions */}
            <div className="flex items-center gap-6 pt-2 border-t border-gray-50">
              <div className="flex items-center text-gray-500 font-medium text-sm">
                <ThumbsUp className="w-4 h-4 mr-2" />
                <span>{thread.reactionCount}</span>
              </div>
              <div className="flex items-center text-gray-500 font-medium text-sm">
                <MessageSquare className="w-4 h-4 mr-2" />
                <span>{thread.replyCount} replies</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};