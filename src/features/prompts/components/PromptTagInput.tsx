
import React, { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { TagNamingService } from '../../../services/tagNamingService';

interface PromptTagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export const PromptTagInput: React.FC<PromptTagInputProps> = ({ tags, onChange }) => {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      
      const { name, isValid } = TagNamingService.normalize(input);
      
      if (isValid) {
        if (!tags.some(t => TagNamingService.normalize(t).slug === TagNamingService.normalize(name).slug)) {
          onChange([...tags, name]);
        }
      }
      setInput('');
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Tags</label>
      <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary transition-all min-h-[46px]">
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 pl-3 pr-2 py-1 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-medium shadow-sm">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-gray-400 hover:text-red-500 ml-1 p-0.5 rounded-full hover:bg-red-50 transition-colors"
            >
              <X size={14} />
            </button>
          </span>
        ))}
        <div className="flex items-center flex-1 min-w-[120px]">
           {!input && tags.length === 0 && <span className="text-gray-400 mr-1"><Plus size={16}/></span>}
           <input
             type="text"
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={handleKeyDown}
             placeholder={tags.length === 0 ? "Add a tag..." : "Add another..."}
             className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-sm py-1"
           />
        </div>
      </div>
    </div>
  );
};
