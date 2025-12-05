
import React from 'react';
import { PromptTemplateViewModel } from '../../../types/prompts.types';
import { PromptRelatedCard } from './PromptRelatedCard';
import { Button } from '../../../components/Button';
import { Plus } from 'lucide-react';

interface PromptAuthorListProps {
  prompts: PromptTemplateViewModel[];
  authorName: string;
  onOpen: (id: string) => void;
  isLoading: boolean;
  onCreateClick: () => void;
  isOwner?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const PromptAuthorList: React.FC<PromptAuthorListProps> = ({ 
  prompts, 
  authorName, 
  onOpen, 
  isLoading, 
  onCreateClick,
  isOwner,
  onEdit,
  onDelete
}) => {
  if (isLoading) {
     return (
        <div className="space-y-4 mb-8">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
            {[1, 2].map(i => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ))}
        </div>
     );
  }

  if (prompts.length === 0) {
    return (
       <div className="mb-8">
          <Button onClick={onCreateClick} className="w-full flex items-center justify-center gap-2">
             <Plus size={18} />
             Create New Prompt
          </Button>
       </div>
    );
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">More from {authorName}</h3>
      <div className="flex flex-col gap-3">
        {prompts.map(prompt => (
           <PromptRelatedCard 
              key={prompt.id} 
              prompt={prompt} 
              onClick={onOpen} 
              hideAuthor={true}
              isOwner={isOwner}
              onEdit={onEdit}
              onDelete={onDelete}
           />
        ))}
      </div>
    </div>
  );
};
