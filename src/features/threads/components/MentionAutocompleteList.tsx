import React from 'react';
import { PromptTemplateViewModel } from '../../../types/prompts.types';
import { Sparkles } from 'lucide-react';

interface MentionAutocompleteListProps {
  suggestions: PromptTemplateViewModel[];
  activeIndex: number;
  onSelect: (prompt: PromptTemplateViewModel) => void;
  position: { top: number; left: number };
  visible: boolean;
}

export const MentionAutocompleteList: React.FC<MentionAutocompleteListProps> = ({
  suggestions,
  activeIndex,
  onSelect,
  position,
  visible
}) => {
  if (!visible || suggestions.length === 0) return null;

  return (
    <div
      className="fixed z-[9999] w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-75"
      style={{
        top: position.top, // RichMentionInput already adds offset
        left: position.left,
      }}
    >
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <Sparkles size={12} className="text-primary-600" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Mention Prompt
        </span>
      </div>
      <ul className="max-h-60 overflow-y-auto">
        {suggestions.map((prompt, index) => (
          <li
            key={prompt.id}
            onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur on input
                onSelect(prompt);
            }}
            className={`
              px-4 py-3 cursor-pointer border-b border-gray-50 last:border-0 transition-colors
              ${index === activeIndex ? 'bg-primary/10' : 'hover:bg-gray-50'}
            `}
          >
            <div className="flex flex-col">
              <span className={`text-sm font-medium ${index === activeIndex ? 'text-gray-900' : 'text-gray-700'}`}>
                {prompt.title}
              </span>
              <div className="flex justify-between items-center mt-1">
                 <span className="text-xs text-gray-400">@{prompt.author.handle}</span>
                 <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                   {prompt.usageCount} uses
                 </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};