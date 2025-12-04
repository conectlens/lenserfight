
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThreadsList } from '../components/ThreadsList';
import { threadsService } from '../../../services/threadsService';
import { promptsService } from '../../../services/promptsService';
import { lenserService } from '../../../services/lenserService';
import { ThreadFeedItem } from '../../../types/threads.types';
import { PromptTemplateViewModel } from '../../../types/prompts.types';
import { Lenser } from '../../../types/lenser.types';
import { TagBadge } from '../../../components/TagBadge';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Plus, ChevronRight, MessageSquareOff, AlertCircle, UserX, Tag } from 'lucide-react';
import { CreateThreadModal } from '../../threads/components/CreateThreadModal';
import { useLenser } from '../../../context/LenserContext';
import { CreateLenserProfileModal } from '../../lenser/components/CreateLenserProfileModal';
import { useAuth } from '../../../context/AuthContext';

const PAGE_SIZE = 10;

export const HomePage: React.FC = () => {
  const [threads, setThreads] = useState<ThreadFeedItem[]>([]);
  const [topPrompts, setTopPrompts] = useState<PromptTemplateViewModel[]>([]);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);
  const [latestLensers, setLatestLensers] = useState<Lenser[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Error States for Widgets
  const [tagsError, setTagsError] = useState(false);
  const [lensersError, setLensersError] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { hasLenser, lenser } = useLenser();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const observer = useRef<IntersectionObserver | null>(null);

  const lastThreadElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  // Combined fetch for initial load to prevent empty state flicker
  useEffect(() => {
    const init = async () => {
        setLoading(true);
        try {
            // Parallel fetches with individual error handling for widgets
            const promptsPromise = promptsService.getTopPrompts(3).catch(() => []);
            const threadsPromise = threadsService.getThreadsFeed(lenser?.id, 0, PAGE_SIZE).catch(() => []);
            
            const tagsPromise = threadsService.getTrendingTags(6)
                .then(data => { setTrendingTags(data); return data; })
                .catch(() => { setTagsError(true); return []; });

            const lensersPromise = lenserService.getLatestJoinedLensers(4)
                .then(data => { setLatestLensers(data); return data; })
                .catch(() => { setLensersError(true); return []; });

            const [prompts, , , initialThreads] = await Promise.all([
                promptsPromise,
                tagsPromise,
                lensersPromise,
                threadsPromise
            ]);
            
            setTopPrompts(prompts);
            setThreads(initialThreads);
            setHasMore(initialThreads.length === PAGE_SIZE);
            setPage(0);
        } catch (error) {
            console.error("Failed to load home data", error);
        } finally {
            setLoading(false);
        }
    };
    init();
  }, [lenser?.id]); // Re-run if user context changes to update reaction states

  // Infinite Scroll Effect
  useEffect(() => {
      if (page === 0) return; // Initial load handled above
      
      const loadMore = async () => {
          setLoadingMore(true);
          try {
              const offset = page * PAGE_SIZE;
              const newThreads = await threadsService.getThreadsFeed(lenser?.id, offset, PAGE_SIZE);
              
              if (newThreads.length === 0) {
                  setHasMore(false);
              } else {
                  setThreads(prev => [...prev, ...newThreads]);
                  if (newThreads.length < PAGE_SIZE) setHasMore(false);
              }
          } catch (e) {
              console.error("Failed to load more threads", e);
          } finally {
              setLoadingMore(false);
          }
      };
      
      loadMore();
  }, [page, lenser?.id]);

  const handleOpenThread = (id: string) => {
    navigate(`/threads/${id}`);
  };

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    // Enforce Lenser Profile Requirement
    if (!hasLenser) {
        setIsProfileModalOpen(true);
        return; 
    }
    setIsCreateModalOpen(true);
  };

  const handleCreateSuccess = async () => {
    // Reset and reload
    setLoading(true);
    setPage(0);
    const refreshed = await threadsService.getThreadsFeed(lenser?.id, 0, PAGE_SIZE);
    setThreads(refreshed);
    setHasMore(refreshed.length === PAGE_SIZE);
    setLoading(false);
  };

  const SidebarSkeleton = () => (
    <div className="space-y-6 pt-[52px]">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-0 overflow-hidden h-48 animate-pulse">
          <div className="h-10 bg-gray-50 border-b border-gray-100"></div>
          <div className="p-4 space-y-4">
              <div className="h-8 bg-gray-100 rounded"></div>
              <div className="h-8 bg-gray-100 rounded"></div>
              <div className="h-8 bg-gray-100 rounded"></div>
          </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-64 animate-pulse">
           <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
           <div className="space-y-4">
               {[1,2,3,4].map(i => (
                   <div key={i} className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                       <div className="flex-1 space-y-2">
                           <div className="h-3 bg-gray-200 w-3/4 rounded"></div>
                           <div className="h-2 bg-gray-200 w-1/2 rounded"></div>
                       </div>
                   </div>
               ))}
           </div>
      </div>
    </div>
  );

  const MinimalAlert = ({ icon: Icon, text }: { icon: any, text: string }) => (
      <div className="bg-gray-50 border border-gray-100 rounded-lg p-6 flex flex-col items-center justify-center text-center">
          <Icon className="w-5 h-5 text-gray-400 mb-2" />
          <span className="text-xs font-medium text-gray-500">{text}</span>
      </div>
  );

  const isEmpty = !loading && threads.length === 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
      
      {/* Main Feed Column */}
      <div className="lg:col-span-8">
        
        {/* Feed Header / Create Action */}
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Your Feed</h1>
            {!isEmpty && (
                <div className="w-auto">
                    <Button 
                        onClick={handleCreateClick} 
                        className="flex items-center gap-2 px-4 py-2 w-auto"
                    >
                        <Plus size={18} />
                        New Post
                    </Button>
                </div>
            )}
        </div>

        {isEmpty ? (
            <div className="bg-white rounded-2xl border border-gray-200 border-dashed p-10 py-16 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                    <MessageSquareOff size={32} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-500 max-w-sm mb-8 leading-relaxed">
                    Your feed is currently quiet. Be the first to start a conversation, share an idea, or ask a question to the community.
                </p>
                <div className="w-auto">
                    <Button onClick={handleCreateClick} className="flex items-center gap-2 px-6">
                        <Plus size={18} />
                        Create Post
                    </Button>
                </div>
            </div>
        ) : (
            <div className="space-y-6">
                <ThreadsList 
                  threads={threads} 
                  isLoading={loading} 
                  onOpenThread={handleOpenThread} 
                />
                
                {/* Intersection Anchor & Loading Indicator */}
                <div ref={lastThreadElementRef} className="h-4"></div>
                {loadingMore && (
                    <div className="py-4 flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                )}
                {!hasMore && threads.length > 0 && !loading && (
                    <p className="text-center text-gray-400 text-sm py-4">You've reached the end</p>
                )}
            </div>
        )}
      </div>

      {/* Right Sidebar Widgets */}
      <div className="hidden lg:block lg:col-span-4">
        {loading ? (
           <SidebarSkeleton />
        ) : (
           <div className="space-y-6 pt-[52px]">
                {/* Top Prompts Widget */}
                <Card className="p-0 overflow-hidden bg-white">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Top Prompts</h3>
                  </div>
                  <div className="p-2">
                    {topPrompts.map((prompt) => (
                      <div 
                            key={prompt.id} 
                            onClick={() => navigate(`/prompts/${prompt.id}`)}
                            className="p-4 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                        >
                        <p className="text-sm font-medium text-gray-800 line-clamp-2">{prompt.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{prompt.usageCount} uses</p>
                      </div>
                    ))}
                    {topPrompts.length === 0 && (
                        <div className="p-4 text-center text-sm text-gray-400">No prompts found</div>
                    )}
                  </div>
                </Card>

                {/* New Arrivals (Latest Joined) Widget */}
                <Card className="p-6">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">New Arrivals</h3>
                  {lensersError ? (
                      <MinimalAlert icon={AlertCircle} text="Unable to load new members" />
                  ) : latestLensers.length === 0 ? (
                      <MinimalAlert icon={UserX} text="No new members yet" />
                  ) : (
                      <div className="space-y-4">
                          {latestLensers.map((user) => (
                            <div 
                                key={user.id} 
                                className="flex items-center gap-3 group cursor-pointer p-2 -mx-2 hover:bg-gray-50 rounded-lg transition-colors"
                                onClick={() => navigate(`/lenser/${user.handle}`)}
                            >
                              <div className="h-10 w-10 rounded-full ring-2 ring-white bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-100">
                                  <img src={user.avatar_url || ''} alt={user.display_name} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary-700 transition-colors">{user.display_name}</p>
                                      {user.join_order && (
                                          <span className="text-[9px] font-mono text-gray-400 border border-gray-200 rounded px-1">#{user.join_order}</span>
                                      )}
                                  </div>
                                  <p className="text-xs text-gray-500 truncate">@{user.handle}</p>
                              </div>
                              <ChevronRight size={16} className="text-gray-300 group-hover:text-primary transition-colors" />
                            </div>
                          ))}
                      </div>
                  )}
                </Card>

                {/* Trending Tags Widget */}
                <Card className="p-6">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Trending Tags</h3>
                  {tagsError ? (
                      <MinimalAlert icon={AlertCircle} text="Could not load tags" />
                  ) : trendingTags.length === 0 ? (
                      <MinimalAlert icon={Tag} text="No trending topics" />
                  ) : (
                      <div className="flex flex-wrap gap-2">
                        {trendingTags.map(tag => (
                          <TagBadge 
                            key={tag} 
                            label={tag} 
                            onClick={() => navigate(`/tags/${tag.toLowerCase()}`)}
                          />
                        ))}
                      </div>
                  )}
                </Card>
           </div>
        )}
      </div>

      <CreateThreadModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={handleCreateSuccess}
      />

      {isProfileModalOpen && (
        <CreateLenserProfileModal onClose={() => setIsProfileModalOpen(false)} />
      )}
    </div>
  );
};