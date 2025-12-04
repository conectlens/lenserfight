
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { promptsService } from '../../../services/promptsService';
import { PromptTemplateViewModel } from '../../../types/prompts.types';
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

const PAGE_SIZE = 12;

export const PromptsPage: React.FC = () => {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<PromptTemplateViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'popular'>('popular');

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
  
  const { hasLenser, lenser } = useLenser();
  const { isAuthenticated } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Intersection Observer callback
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (isLoading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isLoading, loadingMore, hasMore]);

  // Core fetch function
  const fetchPrompts = async (pageNum: number, reset = false) => {
    try {
      if (reset) setIsLoading(true);
      else setLoadingMore(true);

      const offset = pageNum * PAGE_SIZE;
      let data: PromptTemplateViewModel[] = [];
      
      if (searchQuery) {
        data = await promptsService.search(searchQuery, offset, PAGE_SIZE);
      } else if (selectedTag) {
        data = await promptsService.filter(selectedTag, offset, PAGE_SIZE);
      } else {
        // sort logic is usually handled by backend via sort param, but service has separate sort method.
        // Assuming sort() method supports paginated fetch.
        // If sortOrder changes, we should use that specific method or pass sort param to a unified fetch.
        // Service structure implies separate methods.
        if (sortOrder) {
             data = await promptsService.sort(sortOrder, offset, PAGE_SIZE);
        } else {
             data = await promptsService.getPrompts(offset, PAGE_SIZE);
        }
      }

      if (data.length === 0) {
          setHasMore(false);
          if (reset) setPrompts([]);
      } else {
          setPrompts(prev => reset ? data : [...prev, ...data]);
          if (data.length < PAGE_SIZE) setHasMore(false);
      }

    } catch (error) {
      console.error("Failed to load prompts", error);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };

  // Effect for filter changes (Reset)
  useEffect(() => {
    const timer = setTimeout(() => {
        setPage(0);
        setHasMore(true);
        fetchPrompts(0, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTag, sortOrder, lenser?.id]);

  // Effect for Load More
  useEffect(() => {
      if (page === 0) return; // Handled by reset effect
      fetchPrompts(page, false);
  }, [page]);

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
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
      {/* Page Header */}
      <div className="mb-6 sm:mb-8 mt-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Discover Prompts</h1>
        <p className="text-gray-600 text-base sm:text-lg">
            Find, share, and remix the best AI prompts from the community.
        </p>
      </div>

      {/* Controls Bar - Responsive Layout */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="w-full">
            <PromptsSearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between min-w-0">
            {/* Tag Filter - Horizontal Scroll on Mobile */}
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
      {loadingMore && (
          <div className="py-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
      )}
      {!hasMore && prompts.length > 0 && (
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

      {/* Fallback Profile Modal */}
      {showProfileModal && (
        <CreateLenserProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
};
