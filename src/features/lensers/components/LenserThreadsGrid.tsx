import React from 'react';
import { ThreadRecord } from '../../../types/threads.types';
import { Card } from '../../../components/Card';
import { timeAgo } from '../../../utils/dateUtils';

interface LenserThreadsGridProps {
  threads: ThreadRecord[];
  onOpen: (id: string) => void;
}

export const LenserThreadsGrid: React.FC<LenserThreadsGridProps> = ({ threads, onOpen }) => {
  return (
    <div className="space-y-4">
      {threads.map(thread => (
        <Card key={thread.id} className="p-5 hover:shadow-md cursor-pointer transition-all" >
           <div onClick={() => onOpen(thread.id)}>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{thread.title}</h3>
              <p className="text-gray-600 line-clamp-2 mb-3">{thread.content}</p>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>{timeAgo(thread.created_at)}</span>
                <span>{thread.view_count} views</span>
                <span>{thread.reply_count} replies</span>
              </div>
           </div>
        </Card>
      ))}
    </div>
  );
};
