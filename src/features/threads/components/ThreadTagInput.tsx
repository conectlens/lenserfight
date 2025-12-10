
import React, { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { tagService } from '../../../services/tagService';

interface ThreadTagInputProps {
  tags: string[]; // These are names
  onChange: (tags: string[]) => void;
}

export const ThreadTagInput: React.FC<ThreadTagInputProps> = ({ tags, onChange }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      
      setIsLoading(true);
      try {
          // Use Domain Service to validate and normalize
          // Note: In this UI component we just store the names, 
          // actual persistence usually happens on Form Submit.
          // However, we can use the service here to get the "Canonical Name".
          
          // For immediate UI feedback without persisting to DB yet (Mock approach often persists early, 
          // but proper way is verifying format).
          // If we want to persist *immediately*, we use processUserInput. 
          // If we want to just validate format, we'd use TagValidator directly.
          // Assuming we want to ensure the tag is valid and gets its canonical display name:
          
          const normalizedTag = await tagService.processUserInput(input);
          if (!tags.includes(normalizedTag.name)) {
              onChange([...tags, normalizedTag.name]);
          }
          setInput('');
      } catch (err) {
          console.warn("Invalid tag input", err);
          // Optional: Show error toast
      } finally {
          setIsLoading(false);
      }
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-base font-semibold text-gray-900 dark:text-gray-100">Tags</label>
      <div className={`flex flex-wrap items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border ${isLoading ? 'border-primary' : 'border-gray-200 dark:border-gray-700'} rounded-xl focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary transition-all`}>
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-[#F3F4F6] dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm font-medium">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1"
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
          className="flex-1 min-w-[100px] bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm"
          disabled={isLoading}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">Press Enter or Comma to add a tag</p>
    </div>
  );
};
