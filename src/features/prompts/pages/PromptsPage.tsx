import React, { useEffect, useState } from 'react';
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

export const PromptsPage: React.FC = () => {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<PromptTemplateViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
  
  const { hasLenser } = useLenser();
  const { isAuthenticated } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const fetchPrompts = async () => {
    setIsLoading(true);
    try {
      let data: PromptTemplateViewModel[] = [];
      
      if (searchQuery) {
        data = await promptsService.search(searchQuery);
      } else if (selectedTag) {
        data = await promptsService.filter(selectedTag);
      } else {
        data = await promptsService.getPrompts(); // gets all
      }

      // Client-side Sort
      if (sortOrder === 'newest') {
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else {
        data.sort((a, b) => b.usageCount - a.usageCount);
      }

      setPrompts(data);
    } catch (error) {
      console.error("Failed to load prompts", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchPrompts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTag, sortOrder]);

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

  const handleCreateSuccess = () => {
    fetchPrompts(); // Refresh grid
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