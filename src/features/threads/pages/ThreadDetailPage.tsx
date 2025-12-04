
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useThreadDetailController } from '../hooks/useThreadDetailController';
import { ThreadDetailCard } from '../components/ThreadDetailCard';
import { ThreadRepliesList } from '../components/ThreadRepliesList';
import { ReplyComposer } from '../components/ReplyComposer';
import { Button } from '../../../components/Button';
import { Pencil, Trash2, Lock } from 'lucide-react';
import { useLenser } from '../../../context/LenserContext';
import { useAuth } from '../../../context/AuthContext';
import { CreateLenserProfileModal } from '../../lenser/components/CreateLenserProfileModal';
import { useShareContext } from '../../../context/ShareContext';
import { useUI } from '../../../context/UIContext';
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
  const { setPageActions, setPageTitle } = useUI();
  
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

  const isOwner = lenser && thread && thread.author.id === lenser.id;

  // Set Page Title and Hoist Actions
  useEffect(() => {
    if (thread) {
        setPageTitle(thread.title);
    } else {
        setPageTitle(null);
    }

    if (isOwner) {
        setPageActions([
            { label: 'Edit Thread', icon: <Pencil size={16} />, onClick: () => setIsEditModalOpen(true) },
            { label: 'Delete Thread', icon: <Trash2 size={16} />, onClick: () => setIsDeleteModalOpen(true), variant: 'danger' }
        ]);
    } else {
        setPageActions([]);
    }
    
    return () => {
        setPageActions([]);
        setPageTitle(null);
    };
  }, [isOwner, thread, setPageActions, setPageTitle]);

  // Register share config
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
          navigate('/app');
      } catch (e) {
          console.error(e);
          alert("Failed to delete thread");
          setIsDeleteModalOpen(false);
      } finally {
          setIsDeleting(false);
      }
  };

  const handleEditSuccess = () => {
      window.location.reload(); 
  };

  if (loading) {
    return (
      <div className="w-full">
         <div className="animate-pulse space-y-8">
           <div className="bg-gray-200 h-96 rounded-2xl"></div>
           <div className="bg-gray-200 h-32 rounded-2xl"></div>
         </div>
      </div>
    );
  }

  if (error) {
      if (error === '401') {
          return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="bg-red-50 p-6 rounded-full mb-6">
                    <Lock className="w-12 h-12 text-red-500" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Access Denied</h2>
                <p className="text-gray-500 mb-6">This thread is private and you are not authorized to view it.</p>
                <Button onClick={() => navigate('/app')} className="w-auto inline-block">
                    Return to Feed
                </Button>
            </div>
          );
      }

      return (
        <div className="text-center py-20">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Thread not found</h2>
            <Button onClick={() => navigate('/app')} className="w-auto inline-block">
            Return Home
            </Button>
        </div>
      );
  }

  if (!thread) return null;

  return (
    <div className="max-w-4xl mx-auto">
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
                visibility: 'public'
            }}
          />
      )}

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
