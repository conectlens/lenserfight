
import React from 'react';
import { ActivityFeedItem } from '../../../types/reactions.types';
import { Card } from '../../../components/Card';
import { timeAgo } from '../../../utils/dateUtils';
import { Heart, Bookmark, ThumbsUp, PartyPopper, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LenserActionsListProps {
  actions: ActivityFeedItem[];
}

export const LenserActionsList: React.FC<LenserActionsListProps> = ({ actions }) => {
  const navigate = useNavigate();

  const getIcon = (reaction: string) => {
      switch(reaction) {
          case 'saved': return <Bookmark size={18} className="text-blue-500" />;
          case 'like': return <ThumbsUp size={18} className="text-green-500" />;
          case 'love': return <Heart size={18} className="text-red-500" />;
          case 'clap': return <PartyPopper size={18} className="text-yellow-500" />;
          default: return <Activity size={18} className="text-gray-500" />;
      }
  };

  const getLabel = (reaction: string, targetType: string) => {
      let actionVerb = 'Reacted to';
      if (reaction === 'saved') actionVerb = 'Saved';
      else if (reaction === 'like') actionVerb = 'Liked';
      else if (reaction === 'love') actionVerb = 'Loved';
      else if (reaction === 'clap') actionVerb = 'Clapped for';

      let entityName = 'item';
      if (targetType === 'prompt_template') entityName = 'prompt';
      else if (targetType === 'thread') entityName = 'post';
      else if (targetType === 'thread_reply') entityName = 'reply';

      return `${actionVerb} a ${entityName}`;
  };

  const handleClick = (item: ActivityFeedItem) => {
      if (item.targetType === 'prompt_template') {
          navigate(`/prompts/${item.targetId}`);
      } else if (item.targetType === 'thread') {
          navigate(`/threads/${item.targetId}`);
      } else if (item.targetType === 'thread_reply') {
           // Currently we don't have deep linking to specific reply, go to thread if possible
           // But ActivityFeedItem for reply stores replyId as targetId. 
           // Navigation would need parent thread ID which isn't in ActivityFeedItem yet without extra fetch.
           // For now, we disable click or just show it.
           // Ideally ActivityFeedItem should have contextLink.
      }
  };

  if (actions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                <Activity size={32} />
            </div>
            <p className="text-gray-500 font-medium">No recent activity.</p>
        </div>
      );
  }

  return (
    <div className="space-y-4">
      {actions.map(action => (
        <Card 
            key={action.id} 
            className={`p-4 flex items-center gap-4 transition-all ${action.targetType !== 'thread_reply' ? 'hover:shadow-md cursor-pointer' : ''}`}
            // @ts-ignore - onClick binding
            onClick={() => handleClick(action)}
        >
           <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
               {getIcon(action.reaction)}
           </div>
           <div className="flex-1 min-w-0">
               <div className="flex justify-between items-start mb-0.5">
                   <p className="text-sm text-gray-500 font-medium">{getLabel(action.reaction, action.targetType)}</p>
                   <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{timeAgo(action.createdAt)}</span>
               </div>
               <p className="text-base font-bold text-gray-900 line-clamp-1 break-words">{action.targetTitle}</p>
           </div>
        </Card>
      ))}
    </div>
  );
};
