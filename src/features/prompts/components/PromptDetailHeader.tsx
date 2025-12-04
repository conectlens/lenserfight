
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PromptTemplateDetailViewModel } from '../../../types/prompts.types';
import { Avatar } from '../../../components/Avatar';
import { TagBadge } from '../../../components/TagBadge';
import { Globe, Lock, Bookmark } from 'lucide-react';
import { formatCount } from '../../../utils/numberUtils';

interface PromptDetailHeaderProps {
  prompt: PromptTemplateDetailViewModel;
  onSave: () => void;
  isSaved: boolean;
  isSaving: boolean;
  saveCount: number;
}

export const PromptDetailHeader: React.FC<PromptDetailHeaderProps> = ({ 
  prompt,
  onSave,
  isSaved,
  isSaving,
  saveCount
}) => {
  const navigate = useNavigate();
  const formattedDate = new Date(prompt.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const hasTags = prompt.tags && prompt.tags.length > 0;

  return (
    <div className="mb-6">
      <div className="flex justify-between items-start gap-4">
        {/* Unified Title Hierarchy */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 tracking-tight leading-tight flex-1">
          {prompt.title}
        </h1>

        {/* Save Action - Top Right */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`
            group relative p-2.5 rounded-xl transition-all duration-200 flex-shrink-0 border
            ${isSaved 
              ? 'bg-primary/10 text-primary-700 border-primary/20 hover:bg-primary/20' 
              : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50 hover:text-gray-600 hover:border-gray-200'}
          `}
          aria-label={isSaved ? "Unsave prompt" : "Save prompt"}
          title={isSaved ? "Unsave" : "Save"}
        >
          <Bookmark size={20} className={`transition-transform duration-200 ${isSaved ? 'fill-current' : ''} group-active:scale-95`} />
          
          {/* Compact Corner Badge */}
          {saveCount > 0 && (
            <span className={`
              absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center 
              text-[10px] font-bold rounded-full border-2 border-white px-1 shadow-sm
              ${isSaved ? 'bg-primary text-gray-900' : 'bg-gray-100 text-gray-600'}
            `}>
              {formatCount(saveCount)}
            </span>
          )}
        </button>
      </div>

      {/* Metadata Row */}
      <div className="flex flex-wrap items-center gap-y-3 text-sm text-gray-500">
        
        <div 
          className="flex items-center gap-2 group cursor-pointer mr-4"
          onClick={() => navigate(`/lenser/${prompt.author.handle}`)}
        >
             <Avatar src={prompt.author.avatarUrl} alt={prompt.author.displayName} size="sm" className="!w-6 !h-6" />
             <span className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{prompt.author.displayName}</span>
        </div>

        <span className="text-gray-300 mr-4 hidden sm:inline">|</span>

        {hasTags && (
            <>
                <div className="flex flex-wrap gap-2 mr-4">
                  {prompt.tags.map(tag => (
                      <TagBadge 
                        key={tag.id} 
                        label={tag.name} 
                        className="bg-gray-100 text-gray-700 font-medium px-2.5 py-0.5 text-xs" 
                        onClick={() => navigate(`/tags/${tag.slug}`)}
                      />
                  ))}
                </div>
                <span className="text-gray-300 mr-4 hidden sm:inline">|</span>
            </>
        )}

        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              {prompt.visibility === 'public' ? <Globe size={14} /> : <Lock size={14} />}
              <span className="capitalize text-xs">{prompt.visibility}</span>
            </div>

            <span className="text-gray-300">•</span>
            
            <span className="text-xs">{formattedDate}</span>
        </div>
      </div>
    </div>
  );
};
