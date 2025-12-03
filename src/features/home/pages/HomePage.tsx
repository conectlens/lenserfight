import React, { useEffect, useState } from 'react';
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
import { Plus, ChevronRight } from 'lucide-react';
import { CreateThreadModal } from '../../threads/components/CreateThreadModal';
import { useLenser } from '../../../context/LenserContext';
import { CreateLenserProfileModal } from '../../lenser/components/CreateLenserProfileModal';
import { useAuth } from '../../../context/AuthContext';

export const HomePage: React.FC = () => {
  const [threads, setThreads] = useState<ThreadFeedItem[]>([]);
  const [topPrompts, setTopPrompts] = useState<PromptTemplateViewModel[]>([]);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);
  const [activeLensers, setActiveLensers] = useState<Lenser[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { hasLenser } = useLenser();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const loadFeed = async () => {
    try {
      const data = await threadsService.getThreadsFeed();
      setThreads(data);
    } catch (error) {
      console.error("Failed to load threads", error);
    }
  };

  const loadSidebarData = async () => {
      try {
          const [prompts, tags, lensers] = await Promise.all([
              promptsService.getTopPrompts(3),
              threadsService.getTrendingTags(6),
              lenserService.getRecentlyActiveLensers(4)
          ]);
          setTopPrompts(prompts);
          setTrendingTags(tags);
          setActiveLensers(lensers);
      } catch (error) {
          console.error("Failed to load sidebar data", error);
      }
  };

  useEffect(() => {
    const init = async () => {
        setLoading(true);
        await Promise.all([loadFeed(), loadSidebarData()]);
        setLoading(false);
    };
    init();
  }, []);

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

  const handleCreateSuccess = () => {
    setLoading(true);
    loadFeed().then(() => setLoading(false));
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-32 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="flex gap-2 flex-wrap">
                <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                <div className="h-6 w-14 bg-gray-200 rounded-full"></div>
                <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
            </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
      
      {/* Main Feed Column */}
      <div className="lg:col-span-8">
        
        {/* Feed Header / Create Action */}
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Your Feed</h1>
            <div className="w-auto">
                <Button 
                    onClick={handleCreateClick} 
                    className="flex items-center gap-2 px-4 py-2 w-auto"
                >
                    <Plus size={18} />
                    New Post
                </Button>
            </div>
        </div>

        <ThreadsList 
          threads={threads} 
          isLoading={loading} 
          onOpenThread={handleOpenThread} 
        />
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

                {/* Recently Active Lensers - Redesigned to User Cards */}
                <Card className="p-6">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Recently Active Lensers</h3>
                  <div className="space-y-4">
                      {activeLensers.map((user) => (
                        <div 
                            key={user.id} 
                            className="flex items-center gap-3 group cursor-pointer p-2 -mx-2 hover:bg-gray-50 rounded-lg transition-colors"
                            onClick={() => navigate(`/lenser/${user.handle}`)}
                        >
                          <div className="h-10 w-10 rounded-full ring-2 ring-white bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-100">
                              <img src={user.avatar_url || ''} alt={user.display_name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary-700 transition-colors">{user.display_name}</p>
                              <p className="text-xs text-gray-500 truncate">@{user.handle}</p>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-primary transition-colors" />
                        </div>
                      ))}
                  </div>
                </Card>

                {/* Trending Tags Widget */}
                <Card className="p-6">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Trending Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {trendingTags.map(tag => (
                      <TagBadge key={tag} label={tag} className="cursor-pointer hover:bg-gray-200 transition-colors" />
                    ))}
                  </div>
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