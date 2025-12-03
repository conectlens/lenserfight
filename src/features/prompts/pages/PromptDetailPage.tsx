import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { promptsService } from '../../../services/promptsService';
import { PromptTemplateDetailViewModel, PromptTemplateViewModel } from '../../../types/prompts.types';
import { useLenser } from '../../../context/LenserContext';
import { useAuth } from '../../../context/AuthContext';
import { ChevronLeft } from 'lucide-react';
import { PromptDetailHeader } from '../components/PromptDetailHeader';
import { PromptDetailContent } from '../components/PromptDetailContent';
import { PromptActionBar } from '../components/PromptActionBar';
import { PromptRelatedList } from '../components/PromptRelatedList';
import { CreateLenserProfileModal } from '../../lenser/components/CreateLenserProfileModal';

export const PromptDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { lenser, hasLenser } = useLenser();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [prompt, setPrompt] = useState<PromptTemplateDetailViewModel | null>(null);
  const [relatedPrompts, setRelatedPrompts] = useState<PromptTemplateViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Action States
  const [isCopying, setIsCopying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Enforce Auth
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: location } });
    }
  }, [authLoading, isAuthenticated, navigate, location]);

  // Initial Load
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      if (!isAuthenticated) return; // Wait for redirect
      
      setLoading(true);
      window.scrollTo(0, 0);
      try {
        const [detail, related] = await Promise.all([
          promptsService.getPromptDetail(id, lenser?.id),
          promptsService.getRelatedPrompts(id)
        ]);
        setPrompt(detail);
        setRelatedPrompts(related);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    if (!authLoading) {
      fetchData();
    }
  }, [id, lenser?.id, isAuthenticated, authLoading]);

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
      
      // Simulate toast delay
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
      if (prompt.isSaved) {
        await promptsService.unsavePrompt(prompt.id, lenser.id);
        setPrompt(prev => prev ? { ...prev, isSaved: false } : null);
      } else {
        await promptsService.savePrompt(prompt.id, lenser.id);
        setPrompt(prev => prev ? { ...prev, isSaved: true } : null);
      }
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRelatedClick = (relatedId: string) => {
    navigate(`/prompts/${relatedId}`);
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

  if (!isAuthenticated) return null; // Will redirect

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

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Back Link */}
      <div className="mb-8">
        <button 
          onClick={() => navigate('/prompts')} 
          className="flex items-center text-gray-500 hover:text-gray-900 transition-colors font-medium"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Library
        </button>
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
          <PromptRelatedList 
            prompts={relatedPrompts} 
            onOpen={handleRelatedClick}
            isLoading={loading}
          />
        </div>
      </div>

      {showProfileModal && (
        <CreateLenserProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
};