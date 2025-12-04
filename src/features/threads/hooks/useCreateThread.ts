
import { useState } from 'react';
import { threadsService } from '../../../services/threadsService';
import { useLenser } from '../../../context/LenserContext';
import { Visibility } from '../../../types/threads.types';

export const useCreateThread = () => {
  const { lenser } = useLenser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createThread = async (
    title: string, 
    content: string, 
    tags: string[],
    visibility: Visibility,
    onSuccess: () => void,
    editId?: string | null
  ) => {
    if (!lenser) {
      setError("You must have a Lenser profile to post.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (editId) {
          await threadsService.updateThread(editId, {
              title, content, tagIds: tags, visibility, lenserId: lenser.id
          }, lenser.id);
      } else {
          await threadsService.createThread({
            title,
            content,
            tagIds: tags,
            lenserId: lenser.id,
            visibility
          });
      }
      
      // Mark as done before calling onSuccess, as onSuccess might unmount the component
      // (e.g., closing the modal or navigating away).
      setIsSubmitting(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to save thread.");
      setIsSubmitting(false);
    }
  };

  return {
    createThread,
    isSubmitting,
    error
  };
};