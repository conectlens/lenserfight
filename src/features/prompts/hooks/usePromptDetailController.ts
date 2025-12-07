import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { promptsService } from '../../../services/promptsService';
import { tagActivityService } from '../../../services/tagActivityService';
import { analyticsService } from '../../../services/analyticsService';
import { useLenser } from '../../../context/LenserContext';
import { useAuth } from '../../../context/AuthContext';
import { PromptTemplateDetailViewModel, PromptTemplateViewModel } from '../../../types/prompts.types';
import { keys } from '../../../hooks/useThreads';

interface PromptDetailData {
  prompt: PromptTemplateDetailViewModel | null;
  relatedPrompts: PromptTemplateViewModel[];
  authorPrompts: PromptTemplateViewModel[];
}

export const usePromptDetailController = (promptId?: string) => {
  const { lenser } = useLenser();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasLoggedView = useRef<string | null>(null);

  const promptCompositeKey = ['prompt-composite', promptId];
  const loggedPromptViews = new Set<string>();

  const { data, isLoading, error } = useQuery<PromptDetailData, Error>({
    queryKey: promptCompositeKey,
    queryFn: async () => {
      if (!promptId) {
        return { prompt: null, relatedPrompts: [], authorPrompts: [] };
      }

      const prompt = await promptsService.getPromptDetail(promptId, lenser?.id);
      if (!prompt) throw new Error('404');

      const [related, authorP] = await Promise.all([
        promptsService.getRelatedPrompts(promptId),
        promptsService.getAuthorPrompts(prompt.author.id),
      ]);

      return {
        prompt,
        relatedPrompts: related,
        authorPrompts: authorP.filter(p => p.id !== promptId).slice(0, 5),
      };
    },
    enabled: !!promptId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: (failureCount, error) => {
      if (error.message === '401' || error.message === '404') return false;
      return failureCount < 2;
    },
  });

  useEffect(() => {
    if (!data?.prompt || !promptId) return;

    if (loggedPromptViews.has(promptId)) return;
    loggedPromptViews.add(promptId);

    analyticsService.trackView('prompt', promptId, {
      userId: user?.id,
      lenserId: lenser?.id,
    });

    const tagIds = data.prompt.tags.map(t => t.id);
    if (tagIds.length > 0) {
      tagActivityService.recordBatchView(tagIds, 'prompt', promptId, lenser?.id);
    }
  }, [data?.prompt, promptId, lenser?.id, user?.id]);

  // Actions
  const updateLocalPrompt = (
    updater: (prev: PromptTemplateDetailViewModel) => PromptTemplateDetailViewModel
  ) => {
    queryClient.setQueryData<PromptDetailData>(promptCompositeKey, (old) => {
      if (!old || !old.prompt) return old;
      return { ...old, prompt: updater(old.prompt) };
    });
  };

  const copyPrompt = async () => {
    if (!data?.prompt || !lenser) return;
    await promptsService.copyPrompt(data.prompt.id, lenser.id);
    updateLocalPrompt(prev => ({
      ...prev,
      reactionCounts: {
        ...prev.reactionCounts,
        copy: prev.reactionCounts.copy + 1,
      },
    }));
  };

  const savePrompt = async (): Promise<boolean> => {
    if (!data?.prompt || !lenser) return false;

    const newSavedState = await promptsService.toggleReaction(data.prompt.id, lenser.id, "saved");

    updateLocalPrompt(prev => {
      const currentCount = prev.reactionCounts.saved;
      const newCount = newSavedState
        ? currentCount + 1
        : Math.max(0, currentCount - 1);

      return {
        ...prev,
        isSaved: newSavedState,
        reactionCounts: { ...prev.reactionCounts, saved: newCount },
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