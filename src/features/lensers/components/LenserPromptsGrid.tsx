import React from 'react';
import { PromptTemplateRecord } from '../../../types/prompts.types';
import { Card } from '../../../components/Card';
import { TagBadge } from '../../../components/TagBadge';

interface LenserPromptsGridProps {
  prompts: PromptTemplateRecord[];
  onOpen: (id: string) => void;
}

export const LenserPromptsGrid: React.FC<LenserPromptsGridProps> = ({ prompts, onOpen }) => {
  // Mock background images for aesthetic matching screenshot
  const getGradient = (i: number) => {
    const gradients = [
      'bg-gradient-to-br from-gray-100 to-gray-200',
      'bg-gradient-to-br from-gray-900 to-black',
      'bg-gradient-to-br from-teal-700 to-teal-900',
      'bg-gradient-to-br from-emerald-300 to-emerald-500',
      'bg-gradient-to-br from-cyan-400 to-blue-500',
      'bg-gradient-to-br from-gray-400 to-gray-500',
      'bg-gradient-to-br from-orange-100 to-orange-200',
      'bg-gradient-to-br from-gray-200 to-gray-300'
    ];
    return gradients[i % gradients.length];
  };

  const getTextColor = (i: number) => {
     const gradients = ['text-gray-900', 'text-white', 'text-white', 'text-white', 'text-white', 'text-white', 'text-gray-900', 'text-gray-900'];
     return gradients[i % gradients.length];
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {prompts.map((prompt, idx) => (
        <div 
            key={prompt.id}
            onClick={() => onOpen(prompt.id)}
            className={`
                group relative aspect-[3/4] rounded-2xl p-6 cursor-pointer overflow-hidden transition-transform hover:scale-[1.02]
                ${getGradient(idx)}
            `}
        >
          <div className="flex flex-col h-full justify-end">
             {/* Simple Icon placeholder */}
             {idx === 1 && <div className="absolute center top-1/3 left-1/2 transform -translate-x-1/2 text-white border border-white/30 p-2 rounded text-2xl font-mono">AI</div>}

             <h3 className={`text-lg font-bold leading-tight mb-2 ${getTextColor(idx)}`}>
               {prompt.title}
             </h3>
             {/* We don't have tags in the basic prompt record for this grid without enrichment, so omitting for visual cleanliness or mocking */}
          </div>
        </div>
      ))}
    </div>
  );
};
