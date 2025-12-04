
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { promptsService } from '../../../services/promptsService';
import { PromptTemplateDetailViewModel, PromptTemplateViewModel } from '../../../types/prompts.types';
import { useLenser } from '../../../context/LenserContext';
import { useAuth } from '../../../context/AuthContext';
import { useShareContext } from '../../../context/ShareContext';
import { useUI } from '../../../context/UIContext';
import { Lock, Pencil, Trash2 } from 'lucide-react';
import { PromptDetailHeader } from '../components/PromptDetailHeader';
import { PromptBodyViewer } from '../components/PromptBodyViewer';
import { PromptRelatedList } from '../components/PromptRelatedList';
import { PromptAuthorList } from '../components/PromptAuthorList';
import { AIResultsSection } from '../../generations/components/AIResultsSection';
import { CreateLenserProfileModal } from '../../lenser/components/CreateLenserProfileModal';
import { useCreatePrompt } from '../hooks/useCreatePrompt';
import { CreatePromptModal } from '../components/CreatePromptModal';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { SEOHead } from '../../../components/SEOHead';

export const PromptDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { lenser, hasLenser } = useLenser();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { setShareConfig } = useShareContext();
  const { setPageActions } = useUI();
  
  const [prompt, setPrompt] = useState<PromptTemplateDetailViewModel | null>(null);
  const [relatedPrompts, setRelatedPrompts] = useState<PromptTemplateViewModel[]>([]);
  const [authorPrompts, setAuthorPrompts] = useState<PromptTemplateViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Access Control State
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  
  // Action States
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Create Prompt Hook
  const { 
    isOpen: isCreateOpen, 
    openModal: openCreateModal, 
    closeModal: closeCreateModal, 
    form: createForm, 
    isSubmitting: isCreateSubmitting, 
    error: createError, 
    submit: submitCreate,
    isEditMode
  } = useCreatePrompt();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: location } });
    }
  }, [authLoading, isAuthenticated, navigate, location]);

  const fetchData = async () => {
    if (!id || !isAuthenticated) return;
    
    setLoading(true);
    setIsUnauthorized(false);
    window.scrollTo(0, 0);
    try {
      const detail = await promptsService.getPromptDetail(id, lenser?.id);
      setPrompt(detail);
      
      const [related, authorP] = await Promise.all([
          promptsService.getRelatedPrompts(id),
          detail ? promptsService.getAuthorPrompts(detail.author.id) : Promise.resolve([])
      ]);
      
      setRelatedPrompts(related);
      setAuthorPrompts(authorP.filter(p => p.id !== id).slice(0, 5));

    } catch (err: any) {
      if (err.message === '401') {
          setIsUnauthorized(true);
      } else {
          console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [id, lenser?.id, isAuthenticated, authLoading]);

  // Register Share Config
  useEffect(() => {
    if (prompt) {
        setShareConfig({
            title: prompt.title,
            resourceType: 'prompt',
            resourceId: prompt.id
        });
    }
    return () => setShareConfig(null);
  }, [prompt, setShareConfig]);

  // Hoist Actions
  const isOwner = lenser && prompt && prompt.author.id === lenser.id;
  useEffect(() => {
    if (isOwner && prompt) {
        setPageActions([
            { label: 'Edit Prompt', icon: <Pencil size={16} />, onClick: () => handleEditClick(prompt.id) },
            { label: 'Delete Prompt', icon: <Trash2 size={16} />, onClick: () => handleDeleteClick(prompt.id), variant: 'danger' }
        ]);
    } else {
        setPageActions([]);
    }
    return () => setPageActions([]);
  }, [isOwner, prompt, setPageActions]);

  const ensureProfile = (): boolean => {
    if (!hasLenser) {
      setShowProfileModal(true);
      return false;
    }
    return true;
  };

  const handleCopy = async () => {
    if (!prompt || !ensureProfile() || !lenser) return;
    
    try {
      await navigator.clipboard.writeText(prompt.content);
      await promptsService.copyPrompt(prompt.id, lenser.id);
      
      // Update local count
      setPrompt(prev => prev ? {
          ...prev,
          reactionCounts: {
              ...prev.reactionCounts,
              copy: prev.reactionCounts.copy + 1
          }
      } : null);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const handleSave = async () => {
    if (!prompt || !ensureProfile() || !lenser) return;

    setIsSaving(true);
    try {
      const isNowSaved = await promptsService.toggleSavePrompt(prompt.id, lenser.id);
      
      // Update state optimistically but also respect the boolean returned by the robust toggle
      setPrompt(prev => {
          if (!prev) return null;
          // Calculate new count based on toggle result
          const currentCount = prev.reactionCounts.saved;
          // If we added it, increment. If we removed it, decrement. 
          // Careful not to go below 0 or desync if original state was already skewed.
          const newCount = isNowSaved ? currentCount + 1 : Math.max(0, currentCount - 1);
          
          return {
            ...prev,
            isSaved: isNowSaved,
            reactionCounts: {
                ...prev.reactionCounts,
                saved: newCount
            }
          };
      });
      
      // Optional: Refetch detail to sync exact counts from DB if critical
      // promptsService.getPromptDetail(prompt.id, lenser.id).then(updated => {
      //    if(updated) setPrompt(updated);
      // });

    } catch (e) {
      console.error("Save failed", e);
      alert("Could not update save status. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromptClick = (targetId: string) => navigate(`/prompts/${targetId}`);

  const handleCreateClick = () => {
    if (ensureProfile()) openCreateModal();
  };

  const handleEditClick = (targetId?: string) => {
    if (!ensureProfile()) return;
    const editId = targetId || prompt?.id;
    
    if (editId) {
        if (prompt && editId === prompt.id) {
             openCreateModal({
                id: prompt.id,
                title: prompt.title,
                content: prompt.content,
                tags: prompt.tags,
                visibility: prompt.visibility
            });
        } else {
            promptsService.getPromptDetail(editId, lenser?.id).then(detail => {
                if (detail) {
                    openCreateModal({
                        id: detail.id,
                        title: detail.title,
                        content: detail.content,
                        tags: detail.tags,
                        visibility: detail.visibility
                    });
                }
            });
        }
    }
  };

  const handleDeleteClick = (targetId: string) => {
      setDeleteTargetId(targetId);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!deleteTargetId || !lenser) return;
      setIsDeleting(true);
      try {
          await promptsService.deletePrompt(deleteTargetId, lenser.id);
          setIsDeleteModalOpen(false);
          
          if (prompt && deleteTargetId === prompt.id) {
              navigate('/prompts');
          } else {
              const authorP = await promptsService.getAuthorPrompts(prompt!.author.id);
              setAuthorPrompts(authorP.filter(p => p.id !== prompt!.id).slice(0, 5));
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsDeleting(false);
          setDeleteTargetId(null);
      }
  };

  const handleCreateSubmit = (id: string) => {
      if (isEditMode && prompt && id === prompt.id) {
          fetchData();
      } else {
          navigate(`/prompts/${id}`);
      }
  };

  if (authLoading || (isAuthenticated && loading)) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-pulse">
        <div className="lg:col-span-8 space-y-8">
           <div className="h-8 w-32 bg-gray-200 rounded"></div>
           <div className="h-16 w-3/4 bg-gray-200 rounded"></div>
           <div className="h-64 w-full bg-gray-200 rounded"></div>
        </div>
        <div className="hidden lg:block lg:col-span-4 space-y-6">
           <div className="h-8 w-40 bg-gray-200 rounded"></div>
           <div className="h-20 w-full bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (isUnauthorized) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-red-50 p-6 rounded-full mb-6">
                <Lock className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Access Denied</h2>
            <button onClick={() => navigate('/prompts')} className="text-primary-700 hover:underline">
                Return to Library
            </button>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Prompt Not Found</h2>
        <button onClick={() => navigate('/prompts')} className="text-primary hover:underline">
            Return to Library
        </button>
      </div>
    );
  }

  return (
    <div>
      <SEOHead type="prompt" data={prompt} />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
          <div className="max-w-[860px] mx-auto">
            <PromptDetailHeader 
                prompt={prompt} 
                onSave={handleSave}
                isSaved={prompt.isSaved}
                isSaving={isSaving}
                saveCount={prompt.reactionCounts.saved}
            />
          </div>
          
          <div className="mb-8">
             <PromptBodyViewer content={prompt.content} onCopy={handleCopy} />
          </div>

          {/* New AI Generations Section */}
          <div className="max-w-[860px] mx-auto">
             <AIResultsSection promptId={prompt.id} />
          </div>
        </div>

        <div className="lg:col-span-4 border-t lg:border-t-0 border-gray-100 pt-8 lg:pt-0">
          <PromptAuthorList 
            prompts={authorPrompts} 
            authorName={prompt.author.displayName}
            onOpen={handlePromptClick}
            isLoading={loading}
            onCreateClick={handleCreateClick}
            isOwner={isOwner}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />

          <PromptRelatedList 
            prompts={relatedPrompts} 
            onOpen={handlePromptClick}
            isLoading={loading}
          />
        </div>
      </div>

      <CreatePromptModal 
        isOpen={isCreateOpen}
        onClose={closeCreateModal}
        onSubmit={() => submitCreate(handleCreateSubmit)}
        form={createForm}
        isSubmitting={isCreateSubmitting}
        error={createError}
        isEditMode={isEditMode}
      />

      {showProfileModal && (
        <CreateLenserProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Prompt"
        message="Are you sure you want to delete this prompt? This action cannot be undone."
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
};
