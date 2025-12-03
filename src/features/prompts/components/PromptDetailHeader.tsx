
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PromptTemplateDetailViewModel } from '../../../types/prompts.types';
import { Avatar } from '../../../components/Avatar';
import { TagBadge } from '../../../components/TagBadge';
import { Globe, Lock } from 'lucide-react';

interface PromptDetailHeaderProps {
  prompt: PromptTemplateDetailViewModel;
}

export const PromptDetailHeader: React.FC<PromptDetailHeaderProps> = ({ prompt }) => {
  const navigate = useNavigate();
  const formattedDate = new Date(prompt.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const hasTags = prompt.tags && prompt.tags.length > 0;

  return (
    <div className="mb-8">
      {/* Title */}
      <h1 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight leading-tight">
        {prompt.title}
      </h1>

      {/* Metadata Row */}
      <div className="flex flex-wrap items-center gap-y-3 text-sm text-gray-500">
        
        {/* Author Info */}
        <div 
          className="flex items-center gap-2 group cursor-pointer mr-4"
          onClick={() => navigate(`/lenser/${prompt.author.handle}`)}
        >
             <Avatar src={prompt.author.avatarUrl} alt={prompt.author.displayName} size="sm" className="!w-6 !h-6" />
             <span className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{prompt.author.displayName}</span>
        </div>

        <span className="text-gray-300 mr-4">|</span>

        {/* Tags (Conditional) */}
        {hasTags && (
            <>
                <div className="flex flex-wrap gap-2 mr-4">
                  {prompt.tags.map(tag => (
                      <TagBadge 
                        key={tag.id} 
                        label={tag.name} 
                        className="bg-gray-100 text-gray-700 font-medium px-2.5 py-0.5" 
                        onClick={() => navigate(`/tags/${tag.slug}`)}
                      />
                  ))}
                </div>
                <span className="text-gray-300 mr-4">|</span>
            </>
        )}

        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              {prompt.visibility === 'public' ? <Globe size={16} /> : <Lock size={16} />}
              <span className="capitalize">{prompt.visibility}</span>
            </div>

            <span className="text-gray-300">•</span>
            
            <span>{formattedDate}</span>
        </div>
      </div>
    </div>
  );
};