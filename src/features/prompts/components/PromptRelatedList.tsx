
import React from 'react';
import { PromptTemplateViewModel } from '../../../types/prompts.types';
import { PromptRelatedCard } from './PromptRelatedCard';
import { FileQuestion } from 'lucide-react';

interface PromptRelatedListProps {
  prompts: PromptTemplateViewModel[];
  onOpen: (id: string) => void;
  isLoading: boolean;
  // Owner actions are typically not needed for 'Related' (algorithm) lists, 
  // but if related items belong to user they might want to edit.
  // We make them optional.
  isOwner?: boolean; 
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const PromptRelatedList: React.FC<PromptRelatedListProps> = ({ 
  prompts, 
  onOpen, 
  isLoading,
  isOwner,
  onEdit,
  onDelete
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-900">Related Prompts</h3>
      
      {prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-gray-100 border-dashed text-center">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400">
                <FileQuestion size={20} />
            </div>
            <p className="text-sm font-medium text-gray-900">No related prompts</p>
            <p className="text-xs text-gray-500 mt-1">We couldn't find any similar templates.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {prompts.map(prompt => (
            <PromptRelatedCard 
                key={prompt.id} 
                prompt={prompt} 
                onClick={onOpen}
                // Check if the prompt belongs to current user if generic isOwner passed, 
                // OR we rely on parent to know if these are "my" related prompts.
                // Usually related prompts are mixed. 
                // We'll leave it disabled for general related list unless specifically requested by passing handlers
                isOwner={false} 
                hideAuthor={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};
