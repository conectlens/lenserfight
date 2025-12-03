import React, { useState } from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { ThreadTagInput } from './ThreadTagInput';
import { useCreateThread } from '../hooks/useCreateThread';
import { Visibility } from '../../../types/threads.types';

interface CreateThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateThreadModal: React.FC<CreateThreadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { createThread, isSubmitting, error } = useCreateThread();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('public');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return; // handled by HTML required, but good safety

    await createThread(title, content, tags, visibility, () => {
        // Reset and close
        setTitle('');
        setContent('');
        setTags([]);
        setVisibility('public');
        onSuccess();
        onClose();
    });
  };

  // Prevent closing if submitting
  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Post">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Content Section Grouping */}
        <div className="space-y-4">
            {/* Field: Content (using generic label Content as per screenshot logic, but splitting logic internally) */}
            <div className="space-y-4">
                <label className="text-base font-semibold text-gray-900 block">Content</label>
                
                {/* Title Input integrated cleanly */}
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title your thread..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all font-medium text-lg"
                    required
                    autoFocus
                />

                {/* Body Textarea */}
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's on your mind?"
                    rows={5}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none"
                />
            </div>
        </div>

        {/* Tags Section */}
        <ThreadTagInput tags={tags} onChange={setTags} />

        {/* Visibility */}
        <div className="space-y-2">
            <label className="text-base font-semibold text-gray-900 block">Visibility</label>
            <div className="relative">
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none appearance-none cursor-pointer"
              >
                <option value="public">Public</option>
                <option value="followers">Followers Only</option>
                <option value="private">Private</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500">
                {visibility === 'public' && "Visible to everyone on ConnectLens."}
                {visibility === 'followers' && "Visible only to users who follow you."}
                {visibility === 'private' && "Visible only to you."}
            </p>
        </div>

        {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

        {/* Footer Buttons */}
        <div className="flex gap-3 pt-2">
            <Button 
                type="button" 
                variant="secondary" 
                onClick={handleClose}
                disabled={isSubmitting}
                className="bg-gray-100 border-transparent hover:bg-gray-200 text-gray-700"
            >
                Cancel
            </Button>
            <Button 
                type="submit" 
                variant="primary"
                isLoading={isSubmitting}
            >
                Publish
            </Button>
        </div>
      </form>
    </Modal>
  );
};