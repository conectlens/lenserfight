
import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { PromptTagInput } from './PromptTagInput';
import { VisibilityEnum } from '../../../types/prompts.types';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { isRequired, minLength } from '../../../utils/validation';
import { FormError } from '../../../components/FormError';

interface CreatePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  form: {
    title: string;
    setTitle: (v: string) => void;
    content: string;
    setContent: (v: string) => void;
    tags: string[];
    setTags: (v: string[]) => void;
    visibility: VisibilityEnum;
    setVisibility: (v: VisibilityEnum) => void;
  };
  isSubmitting: boolean;
  error: string | null;
}

export const CreatePromptModal: React.FC<CreatePromptModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  form,
  isSubmitting,
  error
}) => {
  
  // Define validation rules based on current form state keys
  // Note: We need to map the parent's generic setters to object state for the hook to check against
  const formValues = {
    title: form.title,
    content: form.content,
    tags: form.tags
  };

  const { errors, validate, clearError } = useFormValidation<typeof formValues>({
    title: [isRequired(), minLength(3, "Title must be at least 3 characters")],
    content: [isRequired(), minLength(10, "Content must be at least 10 characters")],
    tags: [] // Optional
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate(formValues)) {
      onSubmit();
    }
  };

  // Wrapper to clear errors when parent updates state
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setTitle(e.target.value);
    clearError('title');
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    form.setContent(e.target.value);
    clearError('content');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Prompt">
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        
        {/* Title Input */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={handleTitleChange}
            placeholder="e.g. 'Midjourney Photorealistic Portrait'"
            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all font-medium ${errors.title ? 'border-red-500' : 'border-gray-200'}`}
          />
          <FormError message={errors.title} />
        </div>

        {/* Content Textarea */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Prompt</label>
          <textarea
            value={form.content}
            onChange={handleContentChange}
            placeholder="Enter your full prompt content here. Use {{variables}} for dynamic inputs..."
            rows={6}
            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none ${errors.content ? 'border-red-500' : 'border-gray-200'}`}
          />
          <FormError message={errors.content} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tags */}
          <PromptTagInput tags={form.tags} onChange={form.setTags} />

          {/* Visibility */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Visibility</label>
            <div className="relative">
              <select
                value={form.visibility}
                onChange={(e) => form.setVisibility(e.target.value as VisibilityEnum)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none appearance-none cursor-pointer"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

        {/* Footer Buttons */}
        <div className="flex gap-3 pt-4 justify-end">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-gray-100 border-transparent hover:bg-gray-200 text-gray-700 w-auto px-6"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary"
            isLoading={isSubmitting}
            className="w-auto px-6 shadow-md"
          >
            Save Prompt
          </Button>
        </div>
      </form>
    </Modal>
  );
};
