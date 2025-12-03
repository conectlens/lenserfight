import { useState } from 'react';
import { promptsService } from '../../../services/promptsService';
import { useLenser } from '../../../context/LenserContext';
import { CreatePromptDTO, VisibilityEnum } from '../../../types/prompts.types';

export const useCreatePrompt = () => {
  const { lenser } = useLenser();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<VisibilityEnum>('private');

  const openModal = () => setIsOpen(true);
  const closeModal = () => {
    setIsOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setTags([]);
    setVisibility('private');
    setError(null);
  };

  const submit = async (onSuccess?: () => void) => {
    if (!lenser) {
      setError("You must have a Lenser profile to create a prompt.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const dto: CreatePromptDTO = {
      title,
      content,
      tagIds: tags,
      visibility,
      lenserId: lenser.id,
      // Optional description logic could be added here if we had a dedicated field
      description: null 
    };

    try {
      await promptsService.createPrompt(dto);
      if (onSuccess) onSuccess();
      closeModal();
    } catch (err: any) {
      setError(err.message || "Failed to create prompt.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isOpen,
    openModal,
    closeModal,
    form: {
      title,
      setTitle,
      content,
      setContent,
      tags,
      setTags,
      visibility,
      setVisibility
    },
    isSubmitting,
    error,
    submit
  };
};