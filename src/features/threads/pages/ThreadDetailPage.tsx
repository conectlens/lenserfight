import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useThreadDetailController } from '../hooks/useThreadDetailController';
import { ThreadDetailCard } from '../components/ThreadDetailCard';
import { ThreadRepliesList } from '../components/ThreadRepliesList';
import { ReplyComposer } from '../components/ReplyComposer';
import { Button } from '../../../components/Button';
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react';
import { useLenser } from '../../../context/LenserContext';
import { useAuth } from '../../../context/AuthContext';
import { CreateLenserProfileModal } from '../../lenser/components/CreateLenserProfileModal';
import { useShareContext } from '../../../context/ShareContext';
import { ActionMenu } from '../../../components/ActionMenu';
import { CreateThreadModal } from '../components/CreateThreadModal';
import { threadsService } from '../../../services/threadsService';
import { ConfirmModal } from '../../../components/ConfirmModal';

export const ThreadDetailPage: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasLenser, lenser } = useLenser();
  const { isAuthenticated } = useAuth();
  const { setShareConfig } = useShareContext();
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { 
    thread, 
    loading, 
    error, 
    toggleReaction, 
    toggleReplyReaction, 
    addReply 
  } = useThreadDetailController(threadId);

  // Register share config when thread loads
  useEffect(() => {
    if (thread) {
        setShareConfig({
            title: thread.title,
            resourceType: 'thread',
            resourceId: thread.id
        });
    }
    return () => setShareConfig(null);
  }, [thread, setShareConfig]);

  const handleToggleReaction = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (!hasLenser) {
      setShowProfileModal(true);
      return;
    }
    toggleReaction();
  };

  const handleReplyReaction = (replyId: string) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (!hasLenser) {
      setShowProfileModal(true);
      return;
    }
    toggleReplyReaction(replyId);
  };

  const confirmDelete = async () => {
      if (!thread || !lenser) return;
      setIsDeleting(true);
      try {
          await threadsService.deleteThread(thread.id, lenser.id);
          setIsDeleteModalOpen(false);
          alert("Thread deleted successfully.");
          navigate('/app');
      } catch (e) {
          console.error(e);
          alert("Failed to delete thread");
          setIsDeleteModalOpen(false);
      } finally {
          setIsDeleting(false);
      }
  };

  const handleEditClick = () => {
      if (!thread) return;
      setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
      // Force reload page to get fresh data
      window.location.reload(); 
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
         <div className="animate-pulse space-y-8">
           <div className="bg-gray-200 h-96 rounded-2xl"></div>
           <div className="bg-gray-200 h-32 rounded-2xl"></div>
         </div>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Thread not found</h2>
        <Button onClick={() => navigate('/app')} className="w-auto inline-block">
          Return Home
        </Button>
      </div>
    );
  }

  // Determine ownership
  const isOwner = lenser && thread.author.id === lenser.id;

  const menuActions = isOwner ? [
      { label: 'Edit Thread', icon: <Pencil size={16} />, onClick: handleEditClick },
      { label: 'Delete Thread', icon: <Trash2 size={16} />, onClick: () => setIsDeleteModalOpen(true), variant: 'danger' as const }
  ] : [];

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back
        </button>

        {isOwner && <ActionMenu actions={menuActions} />}
      </div>
      
      <ThreadDetailCard 
        thread={thread} 
        onToggleReaction={handleToggleReaction}
      />
      
      <div className="mt-8 border-t border-gray-100 pt-8">
          <h3 className="sr-only">Discussion</h3>
          
          <div className="mb-8">
            <ReplyComposer 
                onSubmit={(content) => addReply(content)} 
                placeholder="Share your thoughts on this thread..."
            />
          </div>

          <ThreadRepliesList 
            replies={thread.replies} 
            onReplySubmit={async (content, parentId) => {
                await addReply(content, parentId);
            }}
            onReactionToggle={handleReplyReaction}
          />
      </div>

      {showProfileModal && (
        <CreateLenserProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
          <CreateThreadModal
            isOpen={true}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={handleEditSuccess}
            initialData={{
                id: thread.id,
                title: thread.title,
                content: thread.content,
                tags: thread.tags.map(t => t.name),
                visibility: 'public' // Simplify mapping for now
            }}
          />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Thread"
        message="Are you sure you want to delete this thread? This action cannot be undone."
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
};