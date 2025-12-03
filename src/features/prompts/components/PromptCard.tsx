import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PromptTemplateViewModel } from '../../../types/prompts.types';
import { Avatar } from '../../../components/Avatar';
import { Button } from '../../../components/Button';
import { TagBadge } from '../../../components/TagBadge';

interface PromptCardProps {
  prompt: PromptTemplateViewModel;
  onClick: (id: string) => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, onClick }) => {
  const navigate = useNavigate();

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/lenser/${prompt.author.handle}`);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col h-full hover:shadow-md transition-shadow duration-200">
      <div 
        className="flex items-center gap-3 mb-4 cursor-pointer group/author" 
        onClick={handleUserClick}
      >
        <Avatar src={prompt.author.avatarUrl} alt={prompt.author.displayName} size="sm" className="group-hover/author:opacity-80 transition-opacity" />
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-gray-900 truncate group-hover/author:underline group-hover/author:text-primary-700">{prompt.author.displayName}</p>
          <p className="text-xs text-gray-500 truncate">@{prompt.author.handle}</p>
        </div>
      </div>

      <div className="flex-1 mb-4 cursor-pointer" onClick={() => onClick(prompt.id)}>
        <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight hover:text-deep transition-colors">{prompt.title}</h3>
        <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
          {prompt.description || prompt.title}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5 cursor-pointer" onClick={() => onClick(prompt.id)}>
        {prompt.tags.slice(0, 2).map(tag => (
          <TagBadge key={tag.id} label={tag.name} className="bg-gray-50" />
        ))}
        {prompt.tags.length > 2 && (
          <span className="text-xs text-gray-400 self-center">+{prompt.tags.length - 2} more</span>
        )}
      </div>

      <div className="mt-auto pt-2 border-t border-gray-50">
        <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500">
                {prompt.usageCount} uses
            </span>
            <Button 
                variant="primary" 
                onClick={() => onClick(prompt.id)}
                className="w-auto px-4 py-2 text-sm rounded-lg"
            >
                View
            </Button>
        </div>
      </div>
    </div>
  );
};