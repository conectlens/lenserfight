import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lenserService } from '../../../services/lenserService';
import { reactionService } from '../../../services/reactionService';
import { promptsService } from '../../../services/promptsService';
import { threadsService } from '../../../services/threadsService';
import { Lenser, LenserStats, LenserActivityPoint } from '../../../types/lenser.types';
import { PromptTemplateViewModel } from '../../../types/prompts.types';
import { ThreadFeedItem } from '../../../types/threads.types';
import { ActivityFeedItem } from '../../../types/reactions.types';
import { LenserProfileHeader } from '../components/LenserProfileHeader';
import { LenserStatsRow } from '../components/LenserStatsRow';
import { LenserActivityHeatmap } from '../components/LenserActivityHeatmap';
import { LenserTabs } from '../components/LenserTabs';
import { LenserActionsList } from '../components/LenserActionsList';
import { PromptCard } from '../../prompts/components/PromptCard';
import { ThreadsListCard } from '../../home/components/ThreadsListCard';
import { CreatePromptModal } from '../../prompts/components/CreatePromptModal';
import { CreateThreadModal } from '../../threads/components/CreateThreadModal';
import { useCreatePrompt } from '../../prompts/hooks/useCreatePrompt';
import { useCreateThread } from '../../threads/hooks/useCreateThread';
import { FolderOpen, MessageSquare, Trophy } from 'lucide-react';
import { FEATURES } from '../../../config/runtimeConfig';
import { useAuth } from '../../../context/AuthContext';
import { useShareContext } from '../../../context/ShareContext';
import { ConfirmModal } from '../../../components/ConfirmModal';

export const LenserProfilePage: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setShareConfig } = useShareContext();
  
  const [lenser, setLenser] = useState<Lenser | null>(null);
  const [stats, setStats] = useState<LenserStats | null>(null);
  const [activity, setActivity] = useState<LenserActivityPoint[]>([]);
  
  // Use ViewModels instead of raw Records for full UI support (tags, authors)
  const [prompts, setPrompts] = useState<PromptTemplateViewModel[]>([]);
  const [threads, setThreads] = useState<ThreadFeedItem[]>([]);
  const [actions, setActions] = useState<ActivityFeedItem[]>([]);
  
  const [activeTab, setActiveTab] = useState<'actions' | 'prompts' | 'threads' | 'challenges'>('prompts');
  const [isLoading, setIsLoading] = useState(true);

  // Prompt Edit Logic
  const { 
    isOpen: isPromptModalOpen, 
    openModal: openPromptModal, 
    closeModal: closePromptModal, 
    form: promptForm, 
    isSubmitting: isPromptSubmitting, 
    error: promptError, 
    submit: submitPrompt,
    isEditMode: isPromptEditMode
  } = useCreatePrompt();

  // Thread Edit Logic
  const {
      createThread: submitThread // Reuse hook logic for update call within modal
  } = useCreateThread();
  const [isThreadModalOpen, setIsThreadModalOpen] = useState(false);
  const [editingThread, setEditingThread] = useState<any>(null);

  // Delete Logic
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'prompt' | 'thread' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check ownership
  const isOwner = !!(user && lenser && user.id === lenser.user_id);

  const fetchData = async () => {
    if (!handle) return;
    setIsLoading(true);
    try {
      const lenserData = await lenserService.getLenserByHandle(handle);
      if (!lenserData) {
          return;
      }
      setLenser(lenserData);

      const promises: Promise<any>[] = [
           lenserService.getLenserStats(lenserData.id),
           // Fetch enriched data via main services filtered by author
           promptsService.getAuthorPrompts(lenserData.id),
           // For threads, we need a way to get enriched author threads. 
           threadsService.getThreadsFeed(user?.id).then(all => all.filter(t => t.author.handle === lenserData.handle)),
           reactionService.getUserActivityFeed(lenserData.id)
      ];

      if (FEATURES.LENSER_ACTIVITY) {
           promises.push(lenserService.getLenserActivity(lenserData.id));
      }

      const results = await Promise.all(promises);
      
      setStats(results[0]);
      setPrompts(results[1]);
      setThreads(results[2]);
      setActions(results[3]);
      
      if (FEATURES.LENSER_ACTIVITY && results[4]) {
          setActivity(results[4]);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [handle, user?.id]);

  // Register Share Config
  useEffect(() => {
    if (lenser) {
        setShareConfig({
            title: lenser.display_name,
            resourceType: 'profile',
            resourceId: lenser.id,
            slug: lenser.handle
        });
    }
    return () => setShareConfig(null);
  }, [lenser, setShareConfig]);

  const handleProfileUpdate = (updatedLenser: Lenser) => {
    setLenser(updatedLenser);
  };

  // --- Prompt Actions ---
  const handleEditPrompt = (id: string) => {
      const promptToEdit = prompts.find(p => p.id === id);
      if (promptToEdit) {
          promptsService.getPromptDetail(id, user?.id).then(detail => {
              if (detail) {
                  openPromptModal({
                      id: detail.id,
                      title: detail.title,
                      content: detail.content,
                      tags: detail.tags,
                      visibility: detail.visibility
                  });
              }
          });
      }
  };

  const handleDeletePromptClick = (id: string) => {
      setDeleteTarget({ id, type: 'prompt' });
  };

  // --- Thread Actions ---
  const handleEditThread = (id: string) => {
      const threadToEdit = threads.find(t => t.id === id);
      if (threadToEdit) {
          // Flatten tags to strings for the modal
          setEditingThread({
              id: threadToEdit.id,
              title: threadToEdit.title,
              content: threadToEdit.content,
              tags: threadToEdit.tags.map(t => t.name),
              visibility: 'public' 
          });
          setIsThreadModalOpen(true);
      }
  };

  const handleDeleteThreadClick = (id: string) => {
      setDeleteTarget({ id, type: 'thread' });
  };

  // --- Confirm Delete ---
  const confirmDelete = async () => {
      if (!deleteTarget || !lenser) return;
      setIsDeleting(true);
      try {
          if (deleteTarget.type === 'prompt') {
              await promptsService.deletePrompt(deleteTarget.id, lenser.id);
          } else {
              await threadsService.deleteThread(deleteTarget.id, lenser.id);
          }
          // Do not redirect, just close and refresh
          setDeleteTarget(null);
          await fetchData();
          alert(`${deleteTarget.type === 'prompt' ? 'Prompt' : 'Thread'} deleted successfully.`);
      } catch (e) {
          console.error(e);
          alert("Failed to delete item.");
      } finally {
          setIsDeleting(false);
      }
  };

  if (isLoading) {
    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
             <div className="animate-pulse space-y-8">
                 <div className="h-64 bg-gray-200 rounded-3xl"></div>
                 <div className="flex gap-6 mt-4 px-6">
                     <div className="w-32 h-32 rounded-full bg-gray-200 -mt-20 border-4 border-white"></div>
                     <div className="flex-1 space-y-4 pt-4">
                         <div className="w-1/3 h-8 bg-gray-200 rounded"></div>
                         <div className="w-1/4 h-4 bg-gray-200 rounded"></div>
                     </div>
                 </div>
             </div>
        </div>
    );
  }

  if (!lenser) {
    return (
        <div className="flex justify-center items-center min-h-[50vh]">
            <h2 className="text-xl font-bold text-gray-500">Lenser not found</h2>
        </div>
    );
  }

  const EmptyState = ({ icon: Icon, message }: { icon: any, message: string }) => (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
            <Icon size={32} />
        </div>
        <p className="text-gray-500 font-medium">{message}</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <LenserProfileHeader 
        lenser={lenser} 
        stats={stats} 
        isOwner={isOwner} 
        onProfileUpdate={handleProfileUpdate}
      />
      
      {stats && <div className="px-6 md:px-0"><LenserStatsRow stats={stats} /></div>}
      
      {FEATURES.LENSER_ACTIVITY && (
        <div className="px-6 md:px-0">
           <LenserActivityHeatmap data={activity} />
        </div>
      )}
      
      <div className="px-6 md:px-0">
          <LenserTabs activeTab={activeTab} onChange={setActiveTab} />
          
          <div className="min-h-[300px]">
            {activeTab === 'actions' && (
               <LenserActionsList actions={actions} />
            )}

            {activeTab === 'prompts' && (
                prompts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                        {prompts.map(prompt => (
                            <div key={prompt.id} className="h-full">
                                <PromptCard 
                                    prompt={prompt} 
                                    onClick={(id) => navigate(`/prompts/${id}`)}
                                    isOwner={isOwner}
                                    onEdit={handleEditPrompt}
                                    onDelete={handleDeletePromptClick}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState icon={FolderOpen} message="No prompts created yet." />
                )
            )}
            
            {activeTab === 'threads' && (
                threads.length > 0 ? (
                    <div className="space-y-6">
                        {threads.map(thread => (
                            <ThreadsListCard 
                                key={thread.id} 
                                thread={thread}
                                onOpen={(id) => navigate(`/threads/${id}`)}
                                isOwner={isOwner}
                                onEdit={handleEditThread}
                                onDelete={handleDeleteThreadClick}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState icon={MessageSquare} message="No threads posted yet." />
                )
            )}
            
            {FEATURES.CHALLENGES_TAB && activeTab === 'challenges' && (
                <EmptyState icon={Trophy} message="No challenge history available." />
            )}
          </div>
      </div>

      {/* Edit Modals */}
      <CreatePromptModal 
        isOpen={isPromptModalOpen}
        onClose={closePromptModal}
        onSubmit={() => submitPrompt(fetchData)}
        form={promptForm}
        isSubmitting={isPromptSubmitting}
        error={promptError}
        isEditMode={isPromptEditMode}
      />

      <CreateThreadModal
        isOpen={isThreadModalOpen}
        onClose={() => { setIsThreadModalOpen(false); setEditingThread(null); }}
        onSuccess={fetchData}
        initialData={editingThread}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal 
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`Delete ${deleteTarget?.type === 'prompt' ? 'Prompt' : 'Thread'}`}
        message={`Are you sure you want to delete this ${deleteTarget?.type}? This action cannot be undone.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
};