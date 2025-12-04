
import React, { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { TagNamingService } from '../../../services/tagNamingService';

interface ThreadTagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export const ThreadTagInput: React.FC<ThreadTagInputProps> = ({ tags, onChange }) => {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      
      const { name, isValid } = TagNamingService.normalize(input);
      
      if (isValid) {
        // Prevent duplicates in UI list
        if (!tags.some(t => TagNamingService.normalize(t).slug === TagNamingService.normalize(name).slug)) {
          onChange([...tags, name]);
        }
      }
      setInput('');
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      // Remove last tag if backspace pressed on empty input
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-base font-semibold text-gray-900">Tags</label>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary transition-all">
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-[#F3F4F6] text-gray-800 rounded-full text-sm font-medium">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-gray-400 hover:text-gray-600 ml-1"
            >
              <X size={14} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? "Add a tag..." : ""}
          className="flex-1 min-w-[100px] bg-transparent outline-none text-gray-900 placeholder-gray-400 text-sm"
        />
      </div>
      <p className="text-xs text-gray-500">Press Enter or Comma to add a tag</p>
    </div>
  );
};
