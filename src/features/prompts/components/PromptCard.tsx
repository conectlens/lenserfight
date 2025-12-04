
import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PromptTemplateViewModel } from '../../../types/prompts.types';
import { Avatar } from '../../../components/Avatar';
import { Lock, Copy, Pencil, Trash2 } from 'lucide-react';
import { formatCount } from '../../../utils/numberUtils';

interface PromptCardProps {
  prompt: PromptTemplateViewModel;
  onClick: (id: string) => void;
  isOwner?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const PromptCard: React.FC<PromptCardProps> = memo(({ prompt, onClick, isOwner, onEdit, onDelete }) => {
  const navigate = useNavigate();

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/lenser/${prompt.author.handle}`);
  };

  const handleEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onEdit) onEdit(prompt.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onDelete) onDelete(prompt.id);
  };

  return (
    <div 
        onClick={() => onClick(prompt.id)}
        className="group relative bg-white rounded-xl border border-gray-200 p-6 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 cursor-pointer overflow-hidden h-full"
    >
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100 group-hover:bg-primary transition-colors duration-300" />

      {isOwner && (
          <div className="absolute top-4 right-4 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={handleEdit}
                className="p-1.5 bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 rounded-lg shadow-sm transition-colors"
                title="Edit Prompt"
              >
                  <Pencil size={14} />
              </button>
              <button 
                onClick={handleDelete}
                className="p-1.5 bg-white border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 rounded-lg shadow-sm transition-colors"
                title="Delete Prompt"
              >
                  <Trash2 size={14} />
              </button>
          </div>
      )}

      <div className="flex justify-between items-start mb-4 pt-2">
          <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-primary-800 transition-colors pr-8">
            {prompt.title}
          </h3>
          {prompt.visibility === 'private' && (
              <div className="text-gray-300 ml-2 mt-1 flex-shrink-0" title="Private Prompt">
                  <Lock size={14} />
              </div>
          )}
      </div>

      <div className="mb-6 flex-1">
        <p className="text-gray-500 text-sm leading-relaxed font-normal line-clamp-3">
          {prompt.description || "No description provided."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {prompt.tags.slice(0, 3).map(tag => (
          <span 
            key={tag.id}
            onClick={(e) => {
                e.stopPropagation();
                navigate(`/tags/${tag.slug}`);
            }} 
            className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold bg-gray-50 px-2 py-1 rounded-md border border-gray-100 cursor-pointer hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            {tag.name}
          </span>
        ))}
        {prompt.tags.length > 3 && (
            <span className="text-[10px] text-gray-400 self-center px-1 font-medium">+{prompt.tags.length - 3}</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
          <div 
            className="flex items-center gap-2 group/author z-10" 
            onClick={handleUserClick}
          >
            <Avatar src={prompt.author.avatarUrl} alt={prompt.author.displayName} size="sm" className="!w-6 !h-6 ring-2 ring-white" />
            <span className="text-xs font-medium text-gray-500 group-hover/author:text-gray-900 transition-colors truncate max-w-[120px]">
                {prompt.author.displayName}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-primary-600 transition-colors" title={`${prompt.usageCount} uses`}>
             <Copy size={14} />
             <span className="text-xs font-semibold font-mono">{formatCount(prompt.usageCount)}</span>
          </div>
      </div>
    </div>
  );
});
