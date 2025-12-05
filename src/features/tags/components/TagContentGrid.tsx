
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TaggedContentItem } from '../../../types/tags.types';
import { PromptCard } from '../../prompts/components/PromptCard';
import { Card } from '../../../components/Card';
import { TagBadge } from '../../../components/TagBadge';
import { timeAgo } from '../../../utils/dateUtils';
import { Avatar } from '../../../components/Avatar';
import { ArrowUp, MessageSquare } from 'lucide-react';
import { ThreadFeedItem } from '../../../types/threads.types';
import { PromptTemplateViewModel } from '../../../types/prompts.types';
import { MentionRenderer } from '../../../components/MentionRenderer';

interface TagContentGridProps {
  items: TaggedContentItem[];
  loading: boolean;
}

export const TagContentGrid: React.FC<TagContentGridProps> = ({ items, loading }) => {
  const navigate = useNavigate();

  if (loading) {
     return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
            ))}
        </div>
     );
  }

  if (items.length === 0) {
     return (
         <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50">
             <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">No results found.</p>
             <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try adjusting your filters or check back later.</p>
         </div>
     );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
       {items.map(item => {
           if (item.type === 'prompt') {
               const promptVM = item.data as PromptTemplateViewModel;
               return (
                   <div key={item.id} className="h-full">
                       <PromptCard prompt={promptVM} onClick={(id) => navigate(`/prompts/${id}`)} />
                   </div>
               );
           } 
           
           if (item.type === 'thread') {
               const thread = item.data as ThreadFeedItem;
               const safeTags = (thread.tags || []).filter(t => !!t);

               return (
                   <div key={item.id} onClick={() => navigate(`/threads/${item.id}`)} className="cursor-pointer group h-full">
                       <Card className="h-full flex flex-col hover:shadow-lg transition-all border-gray-200 dark:border-gray-700 hover:border-primary/40 p-6 bg-white dark:bg-gray-800">
                           <div className="flex items-center gap-3 mb-4">
                               <Avatar src={thread.author.avatarUrl} size="sm" className="!w-8 !h-8 ring-2 ring-white dark:ring-gray-800" />
                               <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{thread.author.displayName}</span>
                               <span className="text-xs text-gray-400 ml-auto">{timeAgo(thread.createdAt)}</span>
                           </div>
                           <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3 line-clamp-2 leading-tight group-hover:text-primary-800 dark:group-hover:text-primary-400 transition-colors">
                               {thread.title}
                           </h3>
                           <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 flex-1 leading-relaxed">
                               <MentionRenderer content={thread.content} simple={true} />
                           </div>
                           <div className="flex items-center gap-2 mb-4">
                               {safeTags.slice(0, 2).map(t => (
                                   <TagBadge key={t.id} label={t.name} className="py-0.5 px-2 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" />
                               ))}
                           </div>
                           <div className="flex items-center gap-4 pt-3 border-t border-gray-50 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 mt-auto">
                               <div className="flex items-center gap-1.5 hover:text-primary-700 dark:hover:text-primary-400 transition-colors">
                                   <ArrowUp size={14} /> {thread.reactionCount}
                               </div>
                               <div className="flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white transition-colors">
                                   <MessageSquare size={14} /> {thread.replyCount}
                               </div>
                           </div>
                       </Card>
                   </div>
               );
           }

           return null;
       })}
    </div>
  );
};
