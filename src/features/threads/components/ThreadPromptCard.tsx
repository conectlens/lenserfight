import React from 'react';
import { PromptData } from '../../../types/threads.types';
import { Button } from '../../../components/Button';

interface ThreadPromptCardProps {
  data: PromptData;
}

export const ThreadPromptCard: React.FC<ThreadPromptCardProps> = ({ data }) => {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 my-6">
      <h4 className="text-base font-bold text-gray-900 mb-2">Prompt: {data.title}</h4>
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
        {data.description}
      </p>
      {data.actionLabel && (
        <div className="flex justify-end">
          <Button variant="secondary" className="w-auto text-sm px-4 py-1.5 h-auto">
            {data.actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
