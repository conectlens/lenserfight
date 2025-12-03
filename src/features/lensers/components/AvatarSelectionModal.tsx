import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';

interface AvatarSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  isLoading: boolean;
  currentUrl?: string | null;
}

// System generated avatars (using Dicebear for reliable system generation)
const PRESETS = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Zack',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Buster',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Molly',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Pepper',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Willow',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Garfield',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Salem',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Shadow'
];

export const AvatarSelectionModal: React.FC<AvatarSelectionModalProps> = ({ isOpen, onClose, onSelect, isLoading, currentUrl }) => {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
        setSelected(currentUrl || null);
    }
  }, [isOpen, currentUrl]);

  const handleConfirm = () => {
    if (selected) {
        onSelect(selected);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose an Avatar">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-6">
         {PRESETS.map((url) => (
             <button
                key={url}
                onClick={() => setSelected(url)}
                className={`
                    relative aspect-square rounded-full overflow-hidden border-2 transition-all p-1
                    ${selected === url ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-gray-200'}
                `}
             >
                 <img src={url} alt="Avatar option" className="w-full h-full object-cover rounded-full bg-gray-50" />
             </button>
         ))}
      </div>
      <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isLoading} className="w-auto">Cancel</Button>
          <Button onClick={handleConfirm} disabled={!selected || isLoading} isLoading={isLoading} className="w-auto">Save Avatar</Button>
      </div>
    </Modal>
  );
};