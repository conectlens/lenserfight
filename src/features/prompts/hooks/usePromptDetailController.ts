
import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { promptsService } from '../../../services/promptsService';
import { tagActivityService } from '../../../services/tagActivityService';
import { useLenser } from '../../../context/LenserContext';
import { PromptTemplateDetailViewModel, PromptTemplateViewModel } from '../../../types/prompts.types';
import { keys } from '../../../hooks/useThreads';

interface PromptDetailData {
  prompt: PromptTemplateDetailViewModel | null;
  relatedPrompts: PromptTemplateViewModel[];
  authorPrompts: PromptTemplateViewModel[];
}

export const usePromptDetailController = (promptId?: string) => {
  const { lenser } = useLenser();
  const queryClient = useQueryClient();
  const hasLoggedView = useRef<string | null>(null);

  // Unified Data Pipeline
  const { data, isLoading, error } = useQuery<PromptDetailData, Error>({
    queryKey: ['prompt-composite', promptId, lenser?.id], // Composite key for page-level cache
    queryFn: async () => {
      if (!promptId) return { prompt: null, relatedPrompts: [], authorPrompts: [] };

      // 1. Fetch Primary Detail
      const prompt = await promptsService.getPromptDetail(promptId, lenser?.id);
      
      if (!prompt) {
          throw new Error("404");
      }

      // 2. Parallelize Secondary Data
      // Use prompt.author.id for author prompts
      const [related, authorP] = await Promise.all([
        promptsService.getRelatedPrompts(promptId),
        promptsService.getAuthorPrompts(prompt.author.id)
      ]);

      return {
        prompt,
        relatedPrompts: related,
        authorPrompts: authorP.filter(p => p.id !== promptId).slice(0, 5)
      };
    },
    enabled: !!promptId,
    staleTime: 1000 * 60 * 5, // 5 min
    gcTime: 1000 * 60 * 30, // 30 min
    retry: (failureCount, error) => {
        // Don't retry auth/not-found errors
        if (error.message === '401' || error.message === '404') return false;
        return failureCount < 2;
    }
  });

  // Unified Analytics Effect (Strictly Once per ID)
  useEffect(() => {
    if (data?.prompt && promptId && hasLoggedView.current !== promptId) {
        hasLoggedView.current = promptId;
        
        // Extract tag IDs and fire batch log
        const tagIds = data.prompt.tags.map(t => t.id);
        if (tagIds.length > 0) {
            tagActivityService.recordBatchView(tagIds, 'prompt', promptId, lenser?.id);
        }
    }
  }, [data?.prompt, promptId, lenser?.id]);

  // Actions
  const updateLocalPrompt = (updater: (prev: PromptTemplateDetailViewModel) => PromptTemplateDetailViewModel) => {
      queryClient.setQueryData(['prompt-composite', promptId, lenser?.id], (old: PromptDetailData | undefined) => {
          if (!old || !old.prompt) return old;
          return { ...old, prompt: updater(old.prompt) };
      });
  };

  const copyPrompt = async () => {
      if (!data?.prompt || !lenser) return;
      await promptsService.copyPrompt(data.prompt.id, lenser.id);
      updateLocalPrompt(prev => ({
          ...prev,
          reactionCounts: { ...prev.reactionCounts, copy: prev.reactionCounts.copy + 1 }
      }));
  };

  const savePrompt = async (): Promise<boolean> => {
      if (!data?.prompt || !lenser) return false;
      
      const newSavedState = await promptsService.toggleSavePrompt(data.prompt.id, lenser.id);
      
      updateLocalPrompt(prev => {
          const currentCount = prev.reactionCounts.saved;
          const newCount = newSavedState ? currentCount + 1 : Math.max(0, currentCount - 1);
          return {
              ...prev,
              isSaved: newSavedState,
              reactionCounts: { ...prev.reactionCounts, saved: newCount }
          };
      });
      return newSavedState;
  };

  return {
    prompt: data?.prompt || null,
    relatedPrompts: data?.relatedPrompts || [],
    authorPrompts: data?.authorPrompts || [],
    isLoading,
    error: error ? error.message : null,
    actions: {
        copyPrompt,
        savePrompt
    }
  };
};
