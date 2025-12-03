import React from 'react';
import { PromptCard } from './PromptCard';
import { PromptTemplateViewModel } from '../../../types/prompts.types';

interface PromptsGridProps {
  prompts: PromptTemplateViewModel[];
  isLoading: boolean;
  onOpen: (id: string) => void;
}

export const PromptsGrid: React.FC<PromptsGridProps> = ({ prompts, isLoading, onOpen }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 h-64 p-5 animate-pulse">
            <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                    <div className="h-2 w-1/3 bg-gray-200 rounded"></div>
                </div>
            </div>
            <div className="space-y-3 mb-4">
                <div className="h-6 w-3/4 bg-gray-200 rounded"></div>
                <div className="h-20 w-full bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 border-dashed">
        <p className="text-gray-500">No prompts found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {prompts.map(prompt => (
        <PromptCard key={prompt.id} prompt={prompt} onClick={onOpen} />
      ))}
    </div>
  );
};
