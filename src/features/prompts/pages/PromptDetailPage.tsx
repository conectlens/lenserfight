
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { promptsService } from '../../../services/promptsService';
import { PromptTemplateDetailViewModel, PromptTemplateViewModel } from '../../../types/prompts.types';
import { useLenser } from '../../../context/LenserContext';
import { useAuth } from '../../../context/AuthContext';
import { useShareContext } from '../../../context/ShareContext';
import { ChevronLeft, Lock, Pencil, Trash2 } from 'lucide-react';
import { PromptDetailHeader } from '../components/PromptDetailHeader';
import { PromptDetailContent } from '../components/PromptDetailContent';
import { PromptActionBar } from '../components/PromptActionBar';
import { PromptRelatedList } from '../components/PromptRelatedList';
import { PromptAuthorList } from '../components/PromptAuthorList';
import { CreateLenserProfileModal } from '../../lenser/components/CreateLenserProfileModal';
import { useCreatePrompt } from '../hooks/useCreatePrompt';
import { CreatePromptModal } from '../components/CreatePromptModal';
import { ActionMenu } from '../../../components/ActionMenu';
import { ConfirmModal } from '../../../components/ConfirmModal';

export const PromptDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { lenser, hasLenser } = useLenser();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { setShareConfig } = useShareContext();
  
  const [prompt, setPrompt] = useState<PromptTemplateDetailViewModel | null>(null);
  const [relatedPrompts, setRelatedPrompts] = useState<PromptTemplateViewModel[]>([]);
  const [authorPrompts, setAuthorPrompts] = useState<PromptTemplateViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Access Control State
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  
  // Action States
  const [isCopying, setIsCopying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Create Prompt Hook (Controller for Create/Edit)
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

  // Enforce Auth
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: location } });
    }
  }, [authLoading, isAuthenticated, navigate, location]);

  const fetchData = async () => {
    if (!id) return;
    if (!isAuthenticated) return; 
    
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

  // Initial Load
  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
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

  // Action Handlers
  const ensureProfile = (): boolean => {
    if (!hasLenser) {
      setShowProfileModal(true);
      return false;
    }
    return true;
  };

  const handleCopy = async () => {
    if (!prompt || !ensureProfile() || !lenser) return;
    
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(prompt.content);
      await promptsService.copyPrompt(prompt.id, lenser.id);
      setTimeout(() => setIsCopying(false), 2000);
    } catch (e) {
      console.error("Copy failed", e);
      setIsCopying(false);
    }
  };

  const handleSave = async () => {
    if (!prompt || !ensureProfile() || !lenser) return;

    setIsSaving(true);
    try {
      const isNowSaved = await promptsService.toggleSavePrompt(prompt.id, lenser.id);
      
      setPrompt(prev => {
          if (!prev) return null;
          return {
              ...prev,
              isSaved: isNowSaved,
              reactionCounts: {
                  ...prev.reactionCounts,
                  saved: isNowSaved ? prev.reactionCounts.saved + 1 : prev.reactionCounts.saved - 1
              }
          };
      });

    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromptClick = (targetId: string) => {
    navigate(`/prompts/${targetId}`);
  };

  const handleCreateClick = () => {
    if (ensureProfile()) {
        openCreateModal();
    }
  };

  const handleEditClick = (targetId?: string) => {
    if (!ensureProfile()) return;
    
    // Determine which prompt to edit. If targetId provided (from sidebar list), use that.
    // Otherwise check if current main prompt is edit target.
    const editId = targetId || prompt?.id;
    
    if (editId) {
        // If editing current page prompt, we have data. 
        if (prompt && editId === prompt.id) {
             openCreateModal({
                id: prompt.id,
                title: prompt.title,
                content: prompt.content,
                tags: prompt.tags,
                visibility: prompt.visibility
            });
        } else {
            // Editing sidebar item, might need to fetch detail first if data is incomplete in list view
            // But list view model usually has enough for edit modal init, or we fetch.
            // For now, fetch to be safe and get full content
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
              // Deleted the main prompt being viewed
              alert("Prompt deleted successfully.");
              navigate('/prompts');
          } else {
              // Deleted a sidebar item
              alert("Prompt deleted.");
              // Refresh lists
              const authorP = await promptsService.getAuthorPrompts(prompt!.author.id);
              setAuthorPrompts(authorP.filter(p => p.id !== prompt!.id).slice(0, 5));
          }
      } catch (e) {
          console.error("Failed to delete", e);
          alert("Failed to delete prompt");
      } finally {
          setIsDeleting(false);
          setDeleteTargetId(null);
      }
  };

  if (authLoading || (isAuthenticated && loading)) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8 animate-pulse">
           <div className="h-8 w-32 bg-gray-200 rounded"></div>
           <div className="h-16 w-3/4 bg-gray-200 rounded"></div>
           <div className="h-64 w-full bg-gray-200 rounded"></div>
        </div>
        <div className="hidden lg:block lg:col-span-4 space-y-6 animate-pulse">
           <div className="h-8 w-40 bg-gray-200 rounded"></div>
           <div className="h-20 w-full bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (isUnauthorized) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
            <div className="bg-red-50 p-6 rounded-full mb-6">
                <Lock className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Access Denied</h2>
            <p className="text-gray-500 mb-8 text-center max-w-md text-lg">
                This prompt is private. Only the author can view it.
            </p>
            <button 
                onClick={() => navigate('/prompts')}
                className="text-primary-700 hover:text-primary-900 font-semibold text-lg hover:underline transition-all"
            >
                Return to Library
            </button>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Prompt Not Found</h2>
        <button 
            onClick={() => navigate('/prompts')}
            className="text-primary hover:underline font-medium"
        >
            Return to Library
        </button>
      </div>
    );
  }

  // Determine ownership by matching current lenser id with prompt author id
  const isOwner = lenser && prompt.author.id === lenser.id;

  const menuActions = isOwner ? [
      { label: 'Edit Prompt', icon: <Pencil size={16} />, onClick: () => handleEditClick() },
      { label: 'Delete Prompt', icon: <Trash2 size={16} />, onClick: () => handleDeleteClick(prompt.id), variant: 'danger' as const }
  ] : [];

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header Row with Back & Actions */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('/prompts')} 
          className="flex items-center text-gray-500 hover:text-gray-900 transition-colors font-medium"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Library
        </button>

        {isOwner && (
            <ActionMenu actions={menuActions} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Content Column */}
        <div className="lg:col-span-8">
          <div className="max-w-[860px] mx-auto">
            <PromptDetailHeader prompt={prompt} />
          </div>
          
          {/* Visual Divider */}
          <div className="flex items-center gap-4 py-8 max-w-[860px] mx-auto">
             <div className="h-px bg-gray-200 flex-1"></div>
             <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Prompt Body</span>
             <div className="h-px bg-gray-200 flex-1"></div>
          </div>

          <PromptDetailContent content={prompt.content} />

          <PromptActionBar 
            onCopy={handleCopy} 
            onSave={handleSave} 
            isSaved={prompt.isSaved}
            isCopying={isCopying}
            isSaving={isSaving}
          />
        </div>

        {/* Right Sidebar */}
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

      {/* Create/Edit Prompt Modal */}
      <CreatePromptModal 
        isOpen={isCreateOpen}
        onClose={closeCreateModal}
        onSubmit={() => submitCreate(fetchData)} // Refresh data on success
        form={createForm}
        isSubmitting={isCreateSubmitting}
        error={createError}
        isEditMode={isEditMode}
      />

      {/* Profile Setup Modal */}
      {showProfileModal && (
        <CreateLenserProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      {/* Delete Confirmation */}
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
