
import React, { useState, useRef, useEffect } from 'react';
import { promptsService } from '../../../services/promptsService';
import { PromptTemplateViewModel } from '../../../types/prompts.types';
import { getCaretCoordinates } from '../../../utils/textareaUtils';
import { MentionParser } from '../../../utils/mentionParser';

export const useMentionController = () => {
  const [isMentioning, setIsMentioning] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PromptTemplateViewModel[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mentionStartPos, setMentionStartPos] = useState<number>(-1);

  // Debounce search
  useEffect(() => {
    if (!isMentioning) return;
    
    const timer = setTimeout(async () => {
      try {
        // Use the existing prompts service to search
        const results = await promptsService.search(query);
        // Limit to 5 results for the dropdown
        setSuggestions(results.slice(0, 5));
        setActiveIndex(0);
      } catch (e) {
        console.error("Mention search failed", e);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isMentioning]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>, 
    setValue: (val: string) => void
  ) => {
    const { value, selectionStart } = e.target;
    setValue(value);

    // Look backwards from cursor to find @
    const textBeforeCaret = value.substring(0, selectionStart);
    const lastAtPos = textBeforeCaret.lastIndexOf('@');

    if (lastAtPos !== -1) {
      const textAfterAt = textBeforeCaret.substring(lastAtPos + 1);
      
      // Basic heuristic: check if there are no spaces (single word or phrase detection)
      // For prompt titles which contain spaces, we might allow spaces, but typically mentions stop at newline or specialized chars.
      // We'll allow spaces to support title search, but break on newlines.
      if (!textAfterAt.includes('\n')) {
         setIsMentioning(true);
         setQuery(textAfterAt);
         setMentionStartPos(lastAtPos);
         
         // Calculate coordinates
         const coords = getCaretCoordinates(e.target, lastAtPos);
         setPosition({ top: coords.top, left: coords.left });
         return;
      }
    }

    // Reset if conditions not met
    setIsMentioning(false);
    setSuggestions([]);
  };

  const selectPrompt = (
    prompt: PromptTemplateViewModel, 
    currentContent: string, 
    setValue: (val: string) => void,
    textareaRef: React.RefObject<HTMLTextAreaElement>
  ) => {
    if (mentionStartPos === -1) return;

    // Create the structured token
    const token = MentionParser.createPromptToken(prompt.id);

    // Check for duplicates in the *existing* content
    // We check against the full content, but ignoring the partial text we are currently typing to replace.
    // However, simplest check is: if the token is ALREADY in the text, we block it.
    // The current mention being typed (e.g. "@pro") is not yet a token, so a simple includes check on the token string is safe.
    if (currentContent.includes(token)) {
        setIsMentioning(false);
        setSuggestions([]);
        // Optional: Trigger a toast or UI feedback here
        console.warn("Prompt already mentioned");
        return;
    }

    const beforeMention = currentContent.substring(0, mentionStartPos);
    // We assume the cursor is at the end of the query
    const afterCursor = currentContent.substring(textareaRef.current?.selectionStart || mentionStartPos);
    
    const newValue = `${beforeMention}${token} ${afterCursor}`; // Add a space after
    setValue(newValue);
    
    // Reset State
    setIsMentioning(false);
    setSuggestions([]);
    
    // Focus back
    setTimeout(() => {
        if(textareaRef.current) {
            textareaRef.current.focus();
            // Move caret to end of inserted token + space
            const newCursorPos = mentionStartPos + token.length + 1;
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
    }, 0);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>, 
    currentContent: string,
    setValue: (val: string) => void,
    textareaRef: React.RefObject<HTMLTextAreaElement>
  ) => {
    if (!isMentioning || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      selectPrompt(suggestions[activeIndex], currentContent, setValue, textareaRef);
    } else if (e.key === 'Escape') {
      setIsMentioning(false);
    }
  };

  return {
    isMentioning,
    suggestions,
    activeIndex,
    position,
    handleInputChange,
    handleKeyDown,
    selectPrompt
  };
};
