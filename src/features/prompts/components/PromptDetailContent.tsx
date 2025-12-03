import React from 'react';

interface PromptDetailContentProps {
  content: string;
}

export const PromptDetailContent: React.FC<PromptDetailContentProps> = ({ content }) => {
  return (
    <div className="w-full max-w-[860px] mx-auto bg-white rounded-2xl border border-gray-200/70 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] p-6 md:p-10 transition-all duration-200">
      <div className="prose prose-lg md:prose-xl max-w-none text-gray-800 leading-loose whitespace-pre-wrap font-sans font-normal">
        {content}
      </div>
    </div>
  );
};