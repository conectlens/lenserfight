
import { useState } from 'react';
import { promptsService } from '../../../services/promptsService';
import { useLenser } from '../../../context/LenserContext';
import { CreatePromptDTO, VisibilityEnum } from '../../../types/prompts.types';

export const useCreatePrompt = () => {
  const { lenser } = useLenser();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<VisibilityEnum>('private');

  const openModal = (initialData?: any) => {
      if (initialData) {
          setEditId(initialData.id);
          setTitle(initialData.title);
          setContent(initialData.content || ''); // In real app, might need to fetch full content if list item is partial
          setTags(initialData.tags?.map((t: any) => t.name) || []);
          setVisibility(initialData.visibility || 'public');
      } else {
          resetForm();
      }
      setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditId(null);
    setTitle('');
    setContent('');
    setTags([]);
    setVisibility('private');
    setError(null);
  };

  const submit = async (onSuccess?: (id: string) => void) => {
    if (!lenser) {
      setError("You must have a Lenser profile to create a prompt.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const dto: Partial<CreatePromptDTO> = {
      title,
      content,
      tagIds: tags,
      visibility,
      lenserId: lenser.id,
      description: null 
    };

    try {
      let resultId: string;
      
      if (editId) {
          const updated = await promptsService.updatePrompt(editId, dto, lenser.id);
          resultId = updated.id;
      } else {
          // @ts-ignore - full DTO required for create
          const created = await promptsService.createPrompt(dto as CreatePromptDTO);
          resultId = created.id;
      }
      
      if (onSuccess) onSuccess(resultId);
      closeModal();
    } catch (err: any) {
      setError(err.message || "Failed to save prompt.");
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
    submit,
    isEditMode: !!editId
  };
};
