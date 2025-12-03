import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PromptTemplateViewModel } from '../../../types/prompts.types';
import { Avatar } from '../../../components/Avatar';

interface PromptRelatedCardProps {
  prompt: PromptTemplateViewModel;
  onClick: (id: string) => void;
}

export const PromptRelatedCard: React.FC<PromptRelatedCardProps> = ({ prompt, onClick }) => {
  const navigate = useNavigate();

  return (
    <div className="flex gap-3 items-start p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
      <div onClick={(e) => { e.stopPropagation(); navigate(`/lenser/${prompt.author.handle}`) }}>
         <Avatar src={prompt.author.avatarUrl} size="sm" className="mt-1 hover:opacity-80 transition-opacity" />
      </div>
      <div onClick={() => onClick(prompt.id)} className="flex-1 min-w-0">
         <h4 className="text-sm font-bold text-gray-900 group-hover:text-deep transition-colors line-clamp-2 mb-1">
            {prompt.title}
         </h4>
         <p 
            onClick={(e) => { e.stopPropagation(); navigate(`/lenser/${prompt.author.handle}`) }}
            className="text-xs text-gray-500 hover:underline hover:text-gray-700 truncate"
         >
            by @{prompt.author.handle}
         </p>
      </div>
    </div>
  );
};