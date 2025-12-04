
import React from 'react';
import { Copy, Bookmark, Check } from 'lucide-react';
import { Button } from '../../../components/Button';
import { formatCount } from '../../../utils/numberUtils';

interface PromptActionBarProps {
  onCopy: () => void;
  onSave: () => void;
  isSaved: boolean;
  isCopying: boolean;
  isSaving: boolean;
  copyCount: number;
  saveCount: number;
}

export const PromptActionBar: React.FC<PromptActionBarProps> = ({ 
  onCopy, 
  onSave, 
  isSaved, 
  isCopying, 
  isSaving,
  copyCount,
  saveCount
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8 max-w-[860px] mx-auto w-full px-2">
      <div className="w-full sm:w-[200px]">
        <Button 
          onClick={onCopy} 
          disabled={isCopying}
          className="flex items-center justify-center gap-2 px-6 py-3.5 text-base bg-primary hover:bg-yellow-300 text-gray-900 border-none shadow-sm rounded-xl font-semibold transition-all w-full"
        >
          {isCopying ? (
             <>
               <Check size={20} />
               <span>Copied</span>
             </>
          ) : (
             <>
               <Copy size={20} />
               <span>Copy</span>
             </>
          )}
          {copyCount > 0 && !isCopying && (
              <span className="ml-1 bg-yellow-400/30 px-2 py-0.5 rounded-full text-xs font-bold text-gray-900 min-w-[24px] text-center">
                  {formatCount(copyCount)}
              </span>
          )}
        </Button>
      </div>

      <div className="w-full sm:w-[200px]">
        <Button 
          onClick={onSave}
          disabled={isSaving}
          className={`flex items-center justify-center gap-2 px-6 py-3.5 text-base shadow-sm border rounded-xl font-semibold transition-all w-full ${
            isSaved 
              ? 'bg-gray-100 text-gray-900 border-gray-200 hover:bg-gray-200' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {isSaved ? <Bookmark size={20} fill="currentColor" /> : <Bookmark size={20} />}
          <span>{isSaved ? 'Saved' : 'Save'}</span>
          {saveCount > 0 && (
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center ${isSaved ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-500'}`}>
                  {formatCount(saveCount)}
              </span>
          )}
        </Button>
      </div>
    </div>
  );
};
