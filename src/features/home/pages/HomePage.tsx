
import React, { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThreadsList } from '../components/ThreadsList';
import { TagBadge } from '../../../components/TagBadge';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Plus, ChevronRight, MessageSquareOff, AlertCircle, UserX, Tag } from 'lucide-react';
import { CreateThreadModal } from '../../threads/components/CreateThreadModal';
import { CreateLenserProfileModal } from '../../lenser/components/CreateLenserProfileModal';
import { useLenser } from '../../../context/LenserContext';
import { useAuth } from '../../../context/AuthContext';
import { useThreadsFeed, useTopPrompts, useTrendingTags, useLatestLensers } from '../../../hooks/useThreads';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { hasLenser } = useLenser();
  const { isAuthenticated } = useAuth();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);

  // --- React Query Hooks (Auto Caching & Background Refresh) ---
  const { 
    data: threadsData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading: threadsLoading 
  } = useThreadsFeed();

  const { data: topPrompts, isLoading: promptsLoading } = useTopPrompts();
  const { data: trendingTags, isLoading: tagsLoading, isError: tagsError } = useTrendingTags();
  const { data: latestLensers, isLoading: lensersLoading, isError: lensersError } = useLatestLensers();

  // Flatten infinite query pages
  const threads = threadsData?.pages.flatMap(page => page) || [];
  const isEmpty = !threadsLoading && threads.length === 0;

  // --- Intersection Observer for Infinite Scroll ---
  const observer = useRef<IntersectionObserver | null>(null);
  const lastThreadElementRef = useCallback((node: HTMLDivElement) => {
    if (threadsLoading || isFetchingNextPage) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [threadsLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  // --- Handlers ---
  const handleOpenThread = (id: string) => navigate(`/threads/${id}`);

  const handleCreateClick = () => {
    if (!isAuthenticated) return navigate('/login');
    if (!hasLenser) return setIsProfileModalOpen(true);
    setIsCreateModalOpen(true);
  };

  const handleCreateSuccess = () => {
    // In React Query v5 we would invalidate queries here, but simpler to just reload page or let auto-refetch handle it
    window.location.reload(); 
  };

  // --- Helper Components ---
  const MinimalAlert = ({ icon: Icon, text }: { icon: any, text: string }) => (
      <div className="bg-gray-50 border border-gray-100 rounded-lg p-6 flex flex-col items-center justify-center text-center">
          <Icon className="w-5 h-5 text-gray-400 mb-2" />
          <span className="text-xs font-medium text-gray-500">{text}</span>
      </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
      
      {/* Main Feed Column */}
      <div className="lg:col-span-8">
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Your Feed</h1>
            {!isEmpty && (
                <div className="w-auto">
                    <Button onClick={handleCreateClick} className="flex items-center gap-2 px-4 py-2 w-auto">
                        <Plus size={18} /> New Post
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
                    Your feed is currently quiet. Be the first to start a conversation.
                </p>
                <Button onClick={handleCreateClick} className="flex items-center gap-2 px-6 w-auto">
                    <Plus size={18} /> Create Post
                </Button>
            </div>
        ) : (
            <div className="space-y-6">
                <ThreadsList 
                  threads={threads} 
                  isLoading={threadsLoading} 
                  onOpenThread={handleOpenThread} 
                />
                
                {/* Loader Anchor */}
                <div ref={lastThreadElementRef} className="h-4"></div>
                {isFetchingNextPage && (
                    <div className="py-4 flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Right Sidebar Widgets */}
      <div className="hidden lg:block lg:col-span-4">
           <div className="space-y-6 pt-[52px]">
                {/* Top Prompts Widget */}
                <Card className="p-0 overflow-hidden bg-white">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Top Prompts</h3>
                  </div>
                  <div className="p-2">
                    {promptsLoading ? (
                        <div className="p-4 space-y-3">
                            <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
                            <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
                        </div>
                    ) : topPrompts?.map((prompt) => (
                      <div 
                            key={prompt.id} 
                            onClick={() => navigate(`/prompts/${prompt.id}`)}
                            className="p-4 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                        >
                        <p className="text-sm font-medium text-gray-800 line-clamp-2">{prompt.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{prompt.usageCount} uses</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* New Arrivals Widget */}
                <Card className="p-6">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">New Arrivals</h3>
                  {lensersLoading ? (
                      <div className="space-y-3">
                          {[1,2,3].map(i => <div key={i} className="flex gap-2"><div className="w-8 h-8 bg-gray-200 rounded-full"></div><div className="flex-1 bg-gray-100 rounded h-8"></div></div>)}
                      </div>
                  ) : lensersError ? (
                      <MinimalAlert icon={AlertCircle} text="Error loading members" />
                  ) : (
                      <div className="space-y-4">
                          {latestLensers?.map((user) => (
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
                  {tagsLoading ? (
                      <div className="flex gap-2"><div className="w-12 h-6 bg-gray-200 rounded"></div><div className="w-16 h-6 bg-gray-200 rounded"></div></div>
                  ) : tagsError || !trendingTags?.length ? (
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
