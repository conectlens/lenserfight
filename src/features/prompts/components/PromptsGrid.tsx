
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
      <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="break-inside-avoid mb-6">
            <div className="bg-white rounded-xl border border-gray-100 h-64 p-6 animate-pulse flex flex-col">
              {/* Header */}
              <div className="h-6 w-3/4 bg-gray-200 rounded mb-4 mt-2"></div>
              {/* Text */}
              <div className="space-y-2 mb-6 flex-1">
                  <div className="h-2 w-full bg-gray-200 rounded"></div>
                  <div className="h-2 w-full bg-gray-200 rounded"></div>
                  <div className="h-2 w-full bg-gray-200 rounded"></div>
                  <div className="h-2 w-2/3 bg-gray-200 rounded"></div>
              </div>
              {/* Tags */}
              <div className="flex gap-2 mb-6">
                  <div className="h-5 w-16 bg-gray-200 rounded"></div>
                  <div className="h-5 w-12 bg-gray-200 rounded"></div>
              </div>
              {/* Footer */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200"></div>
                      <div className="h-3 w-20 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-3 w-8 bg-gray-200 rounded"></div>
              </div>
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
    <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6">
      {prompts.map(prompt => (
        <div key={prompt.id} className="break-inside-avoid mb-6">
           <PromptCard prompt={prompt} onClick={onOpen} />
        </div>
      ))}
    </div>
  );
};
