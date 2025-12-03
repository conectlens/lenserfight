import React from 'react';
import { PromptTemplateDetailViewModel } from '../../../types/prompts.types';
import { Avatar } from '../../../components/Avatar';
import { TagBadge } from '../../../components/TagBadge';
import { Globe, Lock } from 'lucide-react';

interface PromptDetailHeaderProps {
  prompt: PromptTemplateDetailViewModel;
}

export const PromptDetailHeader: React.FC<PromptDetailHeaderProps> = ({ prompt }) => {
  const formattedDate = new Date(prompt.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="mb-8">
      {/* Author Info */}
      <div className="flex items-center gap-3 mb-6">
        <Avatar src={prompt.author.avatarUrl} alt={prompt.author.displayName} size="md" />
        <div>
          <h3 className="text-lg font-bold text-gray-900 leading-none">{prompt.author.displayName}</h3>
          <p className="text-sm text-gray-500 mt-1">@{prompt.author.handle}</p>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight leading-tight">
        {prompt.title}
      </h1>

      {/* Tags & Metadata Row */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
        <div className="flex flex-wrap gap-2">
           {prompt.tags.map(tag => (
             <TagBadge key={tag.id} label={tag.name} className="bg-gray-100 text-gray-700 font-medium px-3 py-1" />
           ))}
        </div>
        
        <span className="hidden sm:inline text-gray-300">|</span>

        <div className="flex items-center gap-1.5">
          {prompt.visibility === 'public' ? <Globe size={16} /> : <Lock size={16} />}
          <span className="capitalize">{prompt.visibility}</span>
        </div>

        <span className="text-gray-300">•</span>
        
        <span>{formattedDate}</span>
      </div>
    </div>
  );
};