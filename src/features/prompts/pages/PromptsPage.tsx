
import React, { useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PromptsGrid } from '../components/PromptsGrid';
import { PromptsSearchBar } from '../components/PromptsSearchBar';
import { PromptsTagFilter } from '../components/PromptsTagFilter';
import { PromptsSortDropdown } from '../components/PromptsSortDropdown';
import { Button } from '../../../components/Button';
import { Plus } from 'lucide-react';
import { useCreatePrompt } from '../hooks/useCreatePrompt';
import { CreatePromptModal } from '../components/CreatePromptModal';
import { useLenser } from '../../../context/LenserContext';
import { CreateLenserProfileModal } from '../../lenser/components/CreateLenserProfileModal';
import { useAuth } from '../../../context/AuthContext';
import { usePromptsFeed } from '../../../hooks/useThreads';
import { SEOHead } from '../../../components/SEOHead';

export const PromptsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasLenser } = useLenser();
  const { isAuthenticated } = useAuth();
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'popular'>('popular');
  const [showProfileModal, setShowProfileModal] = useState(false);

  // React Query Hook
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading 
  } = usePromptsFeed(searchQuery, selectedTag, sortOrder);

  const prompts = data?.pages.flatMap(page => page) || [];

  // Create Prompt Logic
  const { 
    isOpen: isCreateOpen, 
    openModal, 
    closeModal, 
    form, 
    isSubmitting, 
    error: createError, 
    submit 
  } = useCreatePrompt();

  // Intersection Observer callback
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (isLoading || isFetchingNextPage) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (!hasLenser) {
      setShowProfileModal(true);
    } else {
      openModal();
    }
  };

  const handleCreateSuccess = (id: string) => {
    navigate(`/prompts/${id}`);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 px-2 sm:px-4 lg:px-8">
      <SEOHead type="prompts-list" />
      
      {/* Page Header */}
      <div className="mb-6 sm:mb-8 mt-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Discover Prompts</h1>
        <p className="text-gray-600 text-base sm:text-lg">
            Find, share, and remix the best AI prompts from the community.
        </p>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="w-full">
            <PromptsSearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between min-w-0">
            <div className="w-full sm:w-auto max-w-full min-w-0">
                <PromptsTagFilter selectedTag={selectedTag} onSelect={setSelectedTag} />
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0 justify-between sm:justify-end">
                <div className="min-w-[120px]">
                  <PromptsSortDropdown value={sortOrder} onChange={setSortOrder} />
                </div>
                <Button 
                  onClick={handleCreateClick}
                  className="w-auto px-4 gap-2 flex items-center whitespace-nowrap"
                >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Create Prompt</span>
                    <span className="sm:hidden">Create</span>
                </Button>
            </div>
        </div>
      </div>

      {/* Grid Content */}
      <PromptsGrid 
        prompts={prompts} 
        isLoading={isLoading} 
        onOpen={(id) => navigate(`/prompts/${id}`)} 
      />
      
      {/* Intersection Anchor & Loader */}
      <div ref={lastElementRef} className="h-4"></div>
      {isFetchingNextPage && (
          <div className="py-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
      )}
      {!hasNextPage && prompts.length > 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No more prompts to load</p>
      )}

      {/* Create Modal */}
      <CreatePromptModal 
        isOpen={isCreateOpen}
        onClose={closeModal}
        onSubmit={() => submit(handleCreateSuccess)}
        form={form}
        isSubmitting={isSubmitting}
        error={createError}
      />

      {showProfileModal && (
        <CreateLenserProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
};
