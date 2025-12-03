
import React from 'react';
import { PromptData } from '../../../types/threads.types';
import { Button } from '../../../components/Button';
import { Sparkles } from 'lucide-react';

interface ThreadPromptCardProps {
  data: PromptData;
  onAction?: () => void;
}

export const ThreadPromptCard: React.FC<ThreadPromptCardProps> = ({ data, onAction }) => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 transition-colors hover:border-primary/30 group">
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex w-10 h-10 rounded-full bg-white border border-gray-100 items-center justify-center text-primary flex-shrink-0 shadow-sm">
            <Sparkles size={18} />
        </div>
        <div className="flex-1">
            <h4 className="text-base font-bold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">
                {data.title}
            </h4>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed line-clamp-2">
                {data.description}
            </p>
            {data.actionLabel && (
                <div className="flex justify-end">
                <Button 
                    variant="secondary" 
                    className="w-auto text-sm px-4 py-1.5 h-auto bg-white border-gray-200 hover:border-primary/50 hover:text-primary-700"
                    onClick={onAction}
                >
                    {data.actionLabel}
                </Button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
