import React from 'react';
import { PromptTemplateDetailViewModel } from '../../../types/prompts.types';
import { Avatar } from '../../../components/Avatar';
import { Button } from '../../../components/Button';
import { PromptTagsBar } from './PromptTagsBar';
import { PromptReactionBar } from './PromptReactionBar';
import { timeAgo } from '../../../utils/dateUtils';
import { Copy, Eye } from 'lucide-react';

interface PromptDetailCardProps {
  prompt: PromptTemplateDetailViewModel;
  onUse: () => void;
}

export const PromptDetailCard: React.FC<PromptDetailCardProps> = ({ prompt, onUse }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-8 border-b border-gray-100">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
            <Avatar src={prompt.author.avatarUrl} alt={prompt.author.displayName} size="md" />
            <div>
                <h3 className="text-base font-semibold text-gray-900">{prompt.author.displayName}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>@{prompt.author.handle}</span>
                    <span>•</span>
                    <span>{timeAgo(prompt.createdAt)}</span>
                </div>
            </div>
        </div>

        {/* Title & Desc */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{prompt.title}</h1>
        {prompt.description && (
            <p className="text-lg text-gray-600 leading-relaxed mb-6">{prompt.description}</p>
        )}

        {/* Tags & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <PromptTagsBar tags={prompt.tags} />
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5 text-gray-500">
                    <Eye size={18} />
                    <span className="text-sm font-medium">{prompt.usageCount} uses</span>
                </div>
                <PromptReactionBar counts={prompt.reactionCounts} />
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-gray-50 p-8">
        <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Prompt Template</h3>
            <button className="text-gray-500 hover:text-gray-900 flex items-center gap-1 text-sm font-medium transition-colors">
                <Copy size={16} />
                Copy
            </button>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <pre className="whitespace-pre-wrap font-sans text-base text-gray-800 leading-relaxed">
                {prompt.content}
            </pre>
        </div>
        
        <div className="mt-8 flex justify-end">
            <Button onClick={onUse} className="w-auto px-8">
                Use This Prompt
            </Button>
        </div>
      </div>
    </div>
  );
};
