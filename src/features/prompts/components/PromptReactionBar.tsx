import React from 'react';
import { Heart, ThumbsUp, PartyPopper } from 'lucide-react';
import { ReactionEnum } from '../../../types/prompts.types';

interface PromptReactionBarProps {
  counts: Record<ReactionEnum, number>;
}

export const PromptReactionBar: React.FC<PromptReactionBarProps> = ({ counts }) => {
  return (
    <div className="flex items-center gap-4">
       <div className="flex items-center gap-1.5 text-gray-600">
         <ThumbsUp size={18} />
         <span className="text-sm font-medium">{counts.like || 0}</span>
       </div>
       <div className="flex items-center gap-1.5 text-gray-600">
         <Heart size={18} />
         <span className="text-sm font-medium">{counts.love || 0}</span>
       </div>
       <div className="flex items-center gap-1.5 text-gray-600">
         <PartyPopper size={18} />
         <span className="text-sm font-medium">{counts.clap || 0}</span>
       </div>
    </div>
  );
};
