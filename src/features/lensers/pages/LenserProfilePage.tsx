
import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import { FolderOpen, MessageSquare, Trophy, Activity } from 'lucide-react';
import { FEATURES } from '../../../config/runtimeConfig';
import { useAuth } from '../../../context/AuthContext';
import { useLenser } from '../../../context/LenserContext';
import { useShareContext } from '../../../context/ShareContext';
import { ConfirmModal } from '../../../components/ConfirmModal';

type TabType = 'actions' | 'prompts' | 'threads' | 'challenges';

interface TabState {
  data: any[];
  page: number;
  hasMore: boolean;
  isLoaded: boolean;
}

const INITIAL_TAB_STATE: TabState = {
  data: [],
  page: 0,
  hasMore: true,
  isLoaded: false
};

// Route param mapping
const TAB_MAP: Record<string, TabType> = {
  t: 'threads',
  p: 'prompts',
  a: 'actions',
  c: 'challenges'
};

const REVERSE_TAB_MAP: Record<string, string> = {
  threads: 't',
  prompts: 'p',
  actions: 'a',
  challenges: 'c'
};

const PAGE_SIZE = 9;

export const LenserProfilePage: React.FC = () => {
  const { handle, tab: routeTab } = useParams<{ handle: string; tab?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lenser: currentUserLenser } = useLenser(); // Get current logged-in lenser for ID
  const { setShareConfig } = useShareContext();
  
  // Profile Data
  const [lenser, setLenser] = useState<Lenser | null>(null);
  const [stats, setStats] = useState<LenserStats | null>(null);
  const [activity, setActivity] = useState<LenserActivityPoint[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Cache State - Stores data for all tabs to avoid refetching
  const [tabCache, setTabCache] = useState<Record<TabType, TabState>>({
    threads: { ...INITIAL_TAB_STATE },
    prompts: { ...INITIAL_TAB_STATE },
    actions: { ...INITIAL_TAB_STATE },
    challenges: { ...INITIAL_TAB_STATE }
  });

  const [loadingTab, setLoadingTab] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  // Active Tab Logic
  const activeTab: TabType = routeTab && TAB_MAP[routeTab] ? TAB_MAP[routeTab] : 'threads';
  
  // Derived state for current view
  const { data: items, page, hasMore, isLoaded } = tabCache[activeTab];

  // Controller Hooks
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

  const { createThread: submitThread } = useCreateThread();
  const [isThreadModalOpen, setIsThreadModalOpen] = useState(false);
  const [editingThread, setEditingThread] = useState<any>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'prompt' | 'thread' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = !!(user && lenser && user.id === lenser.user_id);

  // 1. Fetch Profile & Stats (Only on handle change)
  useEffect(() => {
    if (!handle) return;
    
    // Reset cache when profile changes
    setTabCache({
        threads: { ...INITIAL_TAB_STATE },
        prompts: { ...INITIAL_TAB_STATE },
        actions: { ...INITIAL_TAB_STATE },
        challenges: { ...INITIAL_TAB_STATE }
    });
    
    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const lenserData = await lenserService.getLenserByHandle(handle);
        if (!lenserData) {
            setLoadingProfile(false);
            return;
        }
        setLenser(lenserData);

        // Fetch stats & activity
        const [statsData, activityData] = await Promise.all([
             lenserService.getLenserStats(lenserData.id),
             FEATURES.LENSER_ACTIVITY ? lenserService.getLenserActivity(lenserData.id) : Promise.resolve([])
        ]);
        
        setStats(statsData);
        setActivity(activityData);
      } catch (err) {
        console.error("Profile load error", err);
      } finally {
        setLoadingProfile(false);
      }
    };
    
    fetchProfile();
  }, [handle]);

  // 2. Share Config
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

  // 3. Tab Data Fetching Strategy
  const fetchTabData = async (targetTab: TabType, pageNum: number, refresh = false) => {
      if (!lenser) return;
      
      // Prevent fetching if already loaded and not refreshing/paginating
      if (!refresh && tabCache[targetTab].isLoaded && pageNum === 0) return;

      // Only show global loading if it's the first load or a hard refresh
      if (pageNum === 0) setLoadingTab(true);

      try {
          const offset = pageNum * PAGE_SIZE;
          let newItems: any[] = [];
          
          // Pass currentUserLenser.id as viewerId to allow fetching private items if owner
          const viewerId = currentUserLenser?.id;

          switch (targetTab) {
              case 'prompts':
                  newItems = await promptsService.getAuthorPrompts(lenser.id, offset, PAGE_SIZE, viewerId);
                  break;
              case 'threads':
                  newItems = await threadsService.getThreadsByAuthor(lenser.id, viewerId, offset, PAGE_SIZE);
                  break;
              case 'actions':
                  newItems = await reactionService.getUserActivityFeed(lenser.id, offset, PAGE_SIZE);
                  break;
              case 'challenges':
                  newItems = []; // Not implemented
                  break;
          }

          setTabCache(prev => {
              const currentData = prev[targetTab].data;
              const updatedData = refresh || pageNum === 0 ? newItems : [...currentData, ...newItems];
              
              return {
                  ...prev,
                  [targetTab]: {
                      data: updatedData,
                      page: pageNum,
                      hasMore: newItems.length === PAGE_SIZE,
                      isLoaded: true
                  }
              };
          });

      } catch (e) {
          console.error(`Failed to fetch ${targetTab}`, e);
      } finally {
          setLoadingTab(false);
      }
  };

  // 4. Trigger Fetch on Tab Change if needed
  useEffect(() => {
      if (lenser) {
          // If not loaded yet, fetch initial data
          if (!tabCache[activeTab].isLoaded) {
              fetchTabData(activeTab, 0);
          }
      }
  }, [activeTab, lenser?.id, currentUserLenser?.id]); // Also depend on viewer ID to refresh privates on login

  // 5. Infinite Scroll Observer
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingTab) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        // Use functional state to ensure we get the latest page
        const nextPage = page + 1;
        fetchTabData(activeTab, nextPage);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loadingTab, hasMore, activeTab, page, lenser?.id]);

  // Navigation Handler
  const handleTabChange = (newTab: TabType) => {
      if (newTab === activeTab) return;
      const code = REVERSE_TAB_MAP[newTab];
      navigate(`/lenser/${handle}/${code}`);
  };

  // Actions
  const handleProfileUpdate = (updatedLenser: Lenser) => setLenser(updatedLenser);

  const handleEditPrompt = (id: string) => {
      const promptToEdit = items.find((p: any) => p.id === id);
      if (promptToEdit) {
          promptsService.getPromptDetail(id, currentUserLenser?.id).then(detail => {
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

  const handleEditThread = (id: string) => {
      const threadToEdit = items.find((t: any) => t.id === id);
      if (threadToEdit) {
          setEditingThread({
              id: threadToEdit.id,
              title: threadToEdit.title,
              content: threadToEdit.content,
              tags: threadToEdit.tags.map((t: any) => t.name),
              visibility: 'public' 
          });
          setIsThreadModalOpen(true);
      }
  };

  // Update a single item in cache without refetching
  const updateCacheItem = (tab: TabType, itemId: string, updater: (item: any) => any) => {
      setTabCache(prev => {
          const tabState = prev[tab];
          const newData = tabState.data.map(item => item.id === itemId ? updater(item) : item);
          return {
              ...prev,
              [tab]: { ...tabState, data: newData }
          };
      });
  };

  // Remove item from cache
  const removeCacheItem = (tab: TabType, itemId: string) => {
      setTabCache(prev => {
          const tabState = prev[tab];
          const newData = tabState.data.filter(item => item.id !== itemId);
          return {
              ...prev,
              [tab]: { ...tabState, data: newData }
          };
      });
  };

  const confirmDelete = async () => {
      if (!deleteTarget || !lenser) return;
      setIsDeleting(true);
      try {
          if (deleteTarget.type === 'prompt') {
              await promptsService.deletePrompt(deleteTarget.id, lenser.id);
              removeCacheItem('prompts', deleteTarget.id);
              alert('Prompt deleted successfully.');
          } else {
              await threadsService.deleteThread(deleteTarget.id, lenser.id);
              removeCacheItem('threads', deleteTarget.id);
              alert('Thread deleted successfully.');
          }
          setDeleteTarget(null);
      } catch (e) {
          console.error(e);
          alert("Failed to delete item.");
      } finally {
          setIsDeleting(false);
      }
  };

  // Callback after successful edit/create
  const handleMutationSuccess = (tab: TabType) => {
      // For simplicity on create/full edit, we refresh the specific tab
      fetchTabData(tab, 0, true);
  };

  const handlePromptSubmit = (id: string) => {
      navigate(`/prompts/${id}`);
  };

  // --- Renderers ---

  const SkeletonLoader = () => {
      if (activeTab === 'prompts') {
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>)}
            </div>
          );
      }
      if (activeTab === 'threads') {
          return (
            <div className="space-y-6">
                {[1, 2].map(i => <div key={i} className="h-48 bg-gray-200 rounded-2xl animate-pulse"></div>)}
            </div>
          );
      }
      return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse"></div>)}</div>;
  };

  const EmptyState = ({ icon: Icon, message }: { icon: any, message: string }) => (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500 bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
            <Icon size={32} />
        </div>
        <p className="text-gray-500 font-medium">{message}</p>
    </div>
  );

  if (loadingProfile) {
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

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <LenserProfileHeader 
        lenser={lenser} 
        stats={stats} 
        isOwner={isOwner} 
        onProfileUpdate={handleProfileUpdate}
      />
      
      {/* Pass Join Order for Rank display */}
      {stats && (
        <div className="px-6 md:px-0">
            <LenserStatsRow stats={stats} joinOrder={lenser.join_order} />
        </div>
      )}
      
      {FEATURES.LENSER_ACTIVITY && (
        <div className="px-6 md:px-0">
           <LenserActivityHeatmap data={activity} />
        </div>
      )}
      
      <div className="px-6 md:px-0">
          <LenserTabs activeTab={activeTab} onChange={handleTabChange} />
          
          <div className="min-h-[300px]">
            {/* Actions Tab */}
            {activeTab === 'actions' && (
                <>
                    {items.length > 0 ? (
                        <LenserActionsList actions={items as ActivityFeedItem[]} />
                    ) : (
                        !loadingTab && <EmptyState icon={Activity} message="No recent activity." />
                    )}
                </>
            )}

            {/* Prompts Tab */}
            {activeTab === 'prompts' && (
                <>
                    {items.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                            {items.map(prompt => (
                                <div key={prompt.id} className="h-full">
                                    <PromptCard 
                                        prompt={prompt as PromptTemplateViewModel} 
                                        onClick={(id) => navigate(`/prompts/${id}`)}
                                        isOwner={isOwner}
                                        onEdit={handleEditPrompt}
                                        onDelete={() => setDeleteTarget({ id: prompt.id, type: 'prompt' })}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        !loadingTab && <EmptyState icon={FolderOpen} message="No prompts created yet." />
                    )}
                </>
            )}
            
            {/* Threads Tab */}
            {activeTab === 'threads' && (
                <>
                    {items.length > 0 ? (
                        <div className="space-y-6">
                            {items.map(thread => (
                                <ThreadsListCard 
                                    key={thread.id} 
                                    thread={thread as ThreadFeedItem}
                                    onOpen={(id) => navigate(`/threads/${id}`)}
                                    isOwner={isOwner}
                                    onEdit={handleEditThread}
                                    onDelete={() => setDeleteTarget({ id: thread.id, type: 'thread' })}
                                />
                            ))}
                        </div>
                    ) : (
                        !loadingTab && <EmptyState icon={MessageSquare} message="No threads posted yet." />
                    )}
                </>
            )}
            
            {/* Challenges Tab (Placeholder) */}
            {activeTab === 'challenges' && (
                <EmptyState icon={Trophy} message="No challenge history available." />
            )}

            {/* Loading Indicator / Skeleton */}
            {loadingTab && (
                <div className="mt-6">
                    <SkeletonLoader />
                </div>
            )}

            {/* Infinite Scroll Anchor */}
            <div ref={lastElementRef} className="h-4" />
          </div>
      </div>

      {/* Edit Modals */}
      <CreatePromptModal 
        isOpen={isPromptModalOpen}
        onClose={closePromptModal}
        onSubmit={() => submitPrompt(handlePromptSubmit)}
        form={promptForm}
        isSubmitting={isPromptSubmitting}
        error={promptError}
        isEditMode={isPromptEditMode}
      />

      <CreateThreadModal
        isOpen={isThreadModalOpen}
        onClose={() => { setIsThreadModalOpen(false); setEditingThread(null); }}
        onSuccess={() => handleMutationSuccess('threads')}
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
