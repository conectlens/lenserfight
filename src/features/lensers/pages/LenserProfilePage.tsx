
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lenserService } from '../../../services/lenserService';
import { reactionService } from '../../../services/reactionService';
import { promptsService } from '../../../services/promptsService';
import { threadsService } from '../../../services/threadsService';
import { Lenser, LenserStats, LenserActivityPoint } from '../../../types/lenser.types';
import { XPSummary } from '../../../types/xp.types';
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
import { FolderOpen, MessageSquare, Trophy, Activity, Plus } from 'lucide-react';
import { FEATURES } from '../../../config/runtimeConfig';
import { useAuth } from '../../../context/AuthContext';
import { useLenser } from '../../../context/LenserContext';
import { useShareContext } from '../../../context/ShareContext';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { Button } from '../../../components/Button';
import { SEOHead } from '../../../components/SEOHead';
import { useAnalytics } from '../../../hooks/useAnalytics';

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
  const { lenser: currentUser } = useLenser(); // The currently authenticated user
  const { setShareConfig } = useShareContext();
  const { trackView } = useAnalytics();
  
  // The profile being viewed (fetched via handle)
  const [viewedProfile, setViewedProfile] = useState<Lenser | null>(null);
  const [stats, setStats] = useState<LenserStats | null>(null);
  const [xpSummary, setXpSummary] = useState<XPSummary | null>(null);
  const [activity, setActivity] = useState<LenserActivityPoint[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [tabCache, setTabCache] = useState<Record<TabType, TabState>>({
    threads: { ...INITIAL_TAB_STATE },
    prompts: { ...INITIAL_TAB_STATE },
    actions: { ...INITIAL_TAB_STATE },
    challenges: { ...INITIAL_TAB_STATE }
  });

  const [loadingTab, setLoadingTab] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  const activeTab: TabType = routeTab && TAB_MAP[routeTab] ? TAB_MAP[routeTab] : 'threads';
  
  const { data: items, page, hasMore, isLoaded } = tabCache[activeTab];

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

  const [isThreadModalOpen, setIsThreadModalOpen] = useState(false);
  const [editingThread, setEditingThread] = useState<any>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'prompt' | 'thread' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Ownership Check: Validates if the authenticated user matches the profile handle being viewed
  const isOwner = !!(
    currentUser && 
    handle && 
    currentUser.handle.toLowerCase() === handle.toLowerCase()
  );

  useEffect(() => {
    if (!handle) return;
    
    // Reset state on handle change
    setTabCache({
        threads: { ...INITIAL_TAB_STATE },
        prompts: { ...INITIAL_TAB_STATE },
        actions: { ...INITIAL_TAB_STATE },
        challenges: { ...INITIAL_TAB_STATE }
    });
    setLoadingProfile(true);
    
    const fetchProfile = async () => {
      try {
        const fullProfile = await lenserService.getFullProfileByHandle(handle);
        
        if (!fullProfile) {
            setViewedProfile(null);
            return;
        }

        // Map Full Profile to standard Lenser object
        const lenserData: Lenser = {
            id: fullProfile.id,
            user_id: fullProfile.user_id, // May be undefined in public view
            handle: fullProfile.handle,
            display_name: fullProfile.display_name,
            bio: fullProfile.bio,
            headline: fullProfile.headline,
            avatar_url: fullProfile.avatar_url,
            banner_url: fullProfile.banner_url,
            website_url: fullProfile.website_url,
            join_order: fullProfile.join_order,
            created_at: new Date().toISOString()
        };
        
        setViewedProfile(lenserData);
        
        // Track View
        trackView('profile', fullProfile.id);

        // Map Stats
        setStats({
            promptsCount: fullProfile.prompt_count,
            threadsCount: fullProfile.thread_count,
            followersCount: fullProfile.follower_count,
            followingCount: fullProfile.following_count,
            winsCount: 0
        });

        // Map XP
        setXpSummary({
            totalXp: fullProfile.xp,
            currentLevel: fullProfile.current_level,
            rank: fullProfile.global_rank,
            currentLevelMinXp: fullProfile.xp_min,
            currentLevelMaxXp: fullProfile.xp_max
        });

        if (FEATURES.LENSER_ACTIVITY) {
            const act = await lenserService.getLenserActivity(fullProfile.id);
            setActivity(act);
        }

      } catch (err) {
        console.error("Profile load error", err);
      } finally {
        setLoadingProfile(false);
      }
    };
    
    fetchProfile();
  }, [handle, trackView]);

  useEffect(() => {
    if (viewedProfile) {
        setShareConfig({
            title: viewedProfile.display_name,
            resourceType: 'profile',
            resourceId: viewedProfile.id,
            slug: viewedProfile.handle
        });
    }
    return () => setShareConfig(null);
  }, [viewedProfile, setShareConfig]);

  const fetchTabData = async (targetTab: TabType, pageNum: number, refresh = false) => {
      if (!viewedProfile) return;
      
      if (!refresh && tabCache[targetTab].isLoaded && pageNum === 0) return;

      if (pageNum === 0) setLoadingTab(true);

      try {
          const offset = pageNum * PAGE_SIZE;
          let newItems: any[] = [];
          
          // Viewer ID is used to determine visibility (show private items if owner)
          const viewerId = currentUser?.id;

          switch (targetTab) {
              case 'prompts':
                  newItems = await promptsService.getAuthorPrompts(viewedProfile.id, offset, PAGE_SIZE, viewerId);
                  break;
              case 'threads':
                  newItems = await threadsService.getThreadsByAuthor(viewedProfile.id, viewerId, offset, PAGE_SIZE);
                  break;
              case 'actions':
                  newItems = await reactionService.getUserActivityFeed(viewedProfile.id, offset, PAGE_SIZE);
                  break;
              case 'challenges':
                  newItems = [];
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

  useEffect(() => {
      if (viewedProfile) {
          // If tab data not loaded, fetch it
          if (!tabCache[activeTab].isLoaded) {
              fetchTabData(activeTab, 0);
          }
      }
  }, [activeTab, viewedProfile?.id, currentUser?.id]);

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingTab) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        const nextPage = page + 1;
        fetchTabData(activeTab, nextPage);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loadingTab, hasMore, activeTab, page, viewedProfile?.id]);

  const handleTabChange = (newTab: TabType) => {
      if (newTab === activeTab) return;
      const code = REVERSE_TAB_MAP[newTab];
      navigate(`/lenser/${handle}/${code}`);
  };

  const handleProfileUpdate = (updatedLenser: Lenser) => setViewedProfile(updatedLenser);

  const handleEditPrompt = (id: string) => {
      const promptToEdit = items.find((p: any) => p.id === id);
      if (promptToEdit) {
          promptsService.getPromptDetail(id, currentUser?.id).then(detail => {
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
      if (!deleteTarget || !currentUser) return;
      setIsDeleting(true);
      try {
          // Use current user ID as actor
          if (deleteTarget.type === 'prompt') {
              await promptsService.deletePrompt(deleteTarget.id, currentUser.id);
              removeCacheItem('prompts', deleteTarget.id);
              alert('Prompt deleted successfully.');
          } else {
              await threadsService.deleteThread(deleteTarget.id, currentUser.id);
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

  const handleMutationSuccess = (tab: TabType) => {
      fetchTabData(tab, 0, true);
  };

  const handlePromptSubmit = (id: string) => {
      handleMutationSuccess('prompts');
  };

  const SkeletonLoader = () => {
      if (activeTab === 'prompts') {
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>)}
            </div>
          );
      }
      if (activeTab === 'threads') {
          return (
            <div className="space-y-6">
                {[1, 2].map(i => <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"></div>)}
            </div>
          );
      }
      return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>)}</div>;
  };

  const EmptyState = ({ icon: Icon, message, action }: { icon: any, message: string, action?: React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 border-dashed">
        <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-gray-300 dark:text-gray-500 shadow-sm border border-gray-100 dark:border-gray-600">
            <Icon size={32} />
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium mb-4">{message}</p>
        {action}
    </div>
  );

  if (loadingProfile) {
    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
             <div className="animate-pulse space-y-8">
                 <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
                 <div className="flex gap-6 mt-4 px-6">
                     <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-800 -mt-20 border-4 border-white dark:border-gray-900"></div>
                     <div className="flex-1 space-y-4 pt-4">
                         <div className="w-1/3 h-8 bg-gray-200 dark:bg-gray-800 rounded"></div>
                         <div className="w-1/4 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                     </div>
                 </div>
             </div>
        </div>
    );
  }

  if (!viewedProfile) {
    return (
        <div className="flex justify-center items-center min-h-[50vh]">
            <div className="text-center">
                <h2 className="text-xl font-bold text-gray-500 dark:text-gray-400 mb-2">Lenser not found</h2>
                <Button onClick={() => navigate('/')} className="w-auto" variant="ghost">Return Home</Button>
            </div>
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <SEOHead type="profile" data={{ lenser: viewedProfile, stats }} />
      
      <LenserProfileHeader 
        lenser={viewedProfile} 
        stats={stats} 
        xpSummary={xpSummary}
        isOwner={isOwner} 
        onProfileUpdate={handleProfileUpdate}
      />
      
      {stats && (
        <div className="px-4 md:px-0">
            <LenserStatsRow stats={stats} joinOrder={viewedProfile.join_order} xpSummary={xpSummary} />
        </div>
      )}
      
      {FEATURES.LENSER_ACTIVITY && (
        <div className="px-4 md:px-0">
           <LenserActivityHeatmap data={activity} />
        </div>
      )}
      
      <div className="px-0 md:px-0 mt-8">
          <div className="px-4 md:px-0">
            <LenserTabs activeTab={activeTab} onChange={handleTabChange} />
          </div>
          
          <div className="min-h-[300px] px-4 md:px-0">
            {activeTab === 'actions' && (
                <>
                    {items.length > 0 ? (
                        <LenserActionsList actions={items as ActivityFeedItem[]} />
                    ) : (
                        !loadingTab && <EmptyState icon={Activity} message="No recent activity." />
                    )}
                </>
            )}

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
                        !loadingTab && <EmptyState 
                            icon={FolderOpen} 
                            message="No prompts created yet." 
                            action={isOwner && (
                                <Button onClick={() => openPromptModal()} className="!w-auto flex items-center gap-2">
                                    <Plus size={16} /> Create Prompt
                                </Button>
                            )}
                        />
                    )}
                </>
            )}
            
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
                        !loadingTab && <EmptyState 
                            icon={MessageSquare} 
                            message="No threads posted yet."
                            action={isOwner && (
                                <Button onClick={() => setIsThreadModalOpen(true)} className="!w-auto flex items-center gap-2">
                                    <Plus size={16} /> Create Thread
                                </Button>
                            )}
                        />
                    )}
                </>
            )}
            
            {activeTab === 'challenges' && (
                <EmptyState icon={Trophy} message="No challenge history available." />
            )}

            {loadingTab && (
                <div className="mt-6">
                    <SkeletonLoader />
                </div>
            )}

            <div ref={lastElementRef} className="h-4" />
          </div>
      </div>

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
