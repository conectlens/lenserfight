import React, { useState } from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { InputField } from '../../auth/components/InputField';
import { Lenser } from '../../../types/lenser.types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { display_name: string; headline: string; bio: string; website_url: string }) => void;
  currentData: Lenser;
  isLoading: boolean;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, onSave, currentData, isLoading }) => {
  const [displayName, setDisplayName] = useState(currentData.display_name);
  const [headline, setHeadline] = useState(currentData.headline || '');
  const [bio, setBio] = useState(currentData.bio || '');
  const [websiteUrl, setWebsiteUrl] = useState(currentData.website_url || '');
  const [urlError, setUrlError] = useState<string | null>(null);

  const validateUrl = (url: string) => {
    if (!url) return true;
    try {
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (websiteUrl && !validateUrl(websiteUrl)) {
        setUrlError("Please enter a valid URL (e.g. https://example.com)");
        return;
    }

    onSave({
        display_name: displayName,
        headline: headline,
        bio: bio,
        website_url: websiteUrl
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField 
            label="Display Name" 
            value={displayName} 
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={50}
        />
        
        <InputField 
            label="Headline" 
            value={headline} 
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Role, Title, or Tagline"
            maxLength={100}
        />

        <InputField 
            label="Website" 
            value={websiteUrl} 
            onChange={(e) => {
                setWebsiteUrl(e.target.value);
                setUrlError(null);
            }}
            placeholder="https://yoursite.com"
            error={urlError || undefined}
        />

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
            <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={300}
                placeholder="Tell us about yourself..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors outline-none resize-none"
            />
            <div className="text-right text-xs text-gray-400 mt-1">{bio.length}/300</div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading} className="w-auto">Cancel</Button>
            <Button type="submit" isLoading={isLoading} className="w-auto">Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
};