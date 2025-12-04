
import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface PromptBodyViewerProps {
  content: string;
  onCopy?: () => void;
}

export const PromptBodyViewer: React.FC<PromptBodyViewerProps> = ({ content, onCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content) return;
    try {
      if (onCopy) {
          onCopy();
      } else {
          await navigator.clipboard.writeText(content);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="w-full max-w-[860px] mx-auto relative group">
      {/* Container */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md relative">
        
        {/* Floating Actions */}
        <div className="absolute top-3 right-3 z-10 flex gap-2">
            <button
              onClick={handleCopy}
              className={`
                relative p-2 rounded-lg transition-all duration-200 border shadow-sm group/btn
                ${copied 
                  ? 'bg-green-50 text-green-600 border-green-200' 
                  : 'bg-white text-gray-500 border-gray-200 hover:text-gray-900 hover:border-gray-300'
                }
              `}
              aria-label="Copy prompt content"
            >
              {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} />}
              
              {/* Tooltip */}
              {!copied && (
                <span className="
                  absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 
                  bg-gray-900 text-white text-[10px] font-bold rounded opacity-0 pointer-events-none
                  group-hover/btn:opacity-100 transition-opacity duration-200 whitespace-nowrap
                ">
                  Copy
                </span>
              )}
            </button>
        </div>

        {/* Content */}
        <pre className="block p-6 pt-10 md:p-8 md:pt-8 overflow-y-auto max-h-[70vh] text-sm md:text-base font-mono leading-7 text-gray-800 bg-white whitespace-pre-wrap break-words scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          <div className="absolute top-4 left-4 select-none opacity-30 pointer-events-none text-gray-400">
             <Terminal size={16} />
          </div>
          <code className="pl-6 block">{content}</code>
        </pre>
      </div>
    </div>
  );
};
