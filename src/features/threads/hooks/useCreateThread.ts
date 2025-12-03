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
    onSuccess: () => void
  ) => {
    if (!lenser) {
      setError("You must have a Lenser profile to post.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await threadsService.createThread({
        title,
        content,
        tagIds: tags,
        lenserId: lenser.id,
        visibility
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create thread.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    createThread,
    isSubmitting,
    error
  };
};