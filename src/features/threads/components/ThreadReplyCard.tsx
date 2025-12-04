
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThreadReplyViewModel } from '../../../types/threads.types';
import { Avatar } from '../../../components/Avatar';
import { timeAgo } from '../../../utils/dateUtils';
import { ThumbsUp, MessageCircle } from 'lucide-react';
import { ReplyComposer } from './ReplyComposer';
import { MentionRenderer } from '../../../components/MentionRenderer';

interface ThreadReplyCardProps {
  reply: ThreadReplyViewModel;
  onReplySubmit: (content: string, parentId: string) => Promise<void>;
  onReactionToggle?: (replyId: string) => void;
}

export const ThreadReplyCard: React.FC<ThreadReplyCardProps> = ({ reply, onReplySubmit, onReactionToggle }) => {
  const navigate = useNavigate();
  const [isReplying, setIsReplying] = useState(false);

  if (reply.isDeleted && (!reply.replies || reply.replies.length === 0)) {
      return null; // Hide completely if deleted and no children
  }

  const handleUserClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      navigate(`/lenser/${reply.author.handle}`);
  };

  return (
    <div className="flex gap-3 md:gap-4 group">
      <div className="flex-shrink-0 flex flex-col items-center">
        <div onClick={handleUserClick} className="cursor-pointer hover:opacity-80 transition-opacity">
            <Avatar src={reply.author.avatarUrl} alt={reply.author.displayName} size="md" className="!w-10 !h-10" />
        </div>
        {/* Thread line for nested visibility */}
        {reply.replies && reply.replies.length > 0 && (
           <div className="w-px h-full bg-gray-200 my-2"></div>
        )}
      </div>
      
      <div className="flex-1 min-w-0 pb-6">
        <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <span 
                onClick={handleUserClick}
                className="font-semibold text-gray-900 text-sm cursor-pointer hover:text-primary-700 hover:underline transition-colors"
              >
                  {reply.author.displayName}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">{timeAgo(reply.createdAt)}</span>
            </div>

            <div className={`text-sm leading-relaxed mb-3 ${reply.isDeleted ? 'text-gray-400 italic' : 'text-gray-800'}`}>
              {reply.isDeleted ? (
                 reply.content
              ) : (
                 <MentionRenderer content={reply.content} />
              )}
            </div>

            {!reply.isDeleted && (
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => onReactionToggle && onReactionToggle(reply.id)}
                        className={`flex items-center gap-1.5 transition-colors text-xs font-medium ${reply.userHasReacted ? 'text-primary-700 font-bold' : 'text-gray-500 hover:text-primary-600'}`}
                    >
                        <ThumbsUp className={`w-3.5 h-3.5 ${reply.userHasReacted ? 'fill-current' : ''}`} />
                        <span>{reply.reactionCount || 'Like'}</span>
                    </button>
                    
                    <button 
                        onClick={() => setIsReplying(!isReplying)}
                        className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-xs font-medium"
                    >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Reply</span>
                    </button>
                </div>
            )}
        </div>

        {isReplying && (
            <div className="mt-3 ml-2 animate-in fade-in slide-in-from-top-2">
                <ReplyComposer 
                    onSubmit={(content) => onReplySubmit(content, reply.id)} 
                    onCancel={() => setIsReplying(false)}
                    autoFocus
                    placeholder={`Reply to ${reply.author.displayName}...`}
                />
            </div>
        )}

        {/* Nested Replies */}
        {reply.replies && reply.replies.length > 0 && (
            <div className="mt-4 space-y-4">
                {reply.replies.map(child => (
                    <ThreadReplyCard 
                        key={child.id} 
                        reply={child} 
                        onReplySubmit={onReplySubmit} 
                        onReactionToggle={onReactionToggle}
                    />
                ))}
            </div>
        )}
      </div>
    </div>
  );
};
