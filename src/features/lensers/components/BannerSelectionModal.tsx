import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';

interface BannerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  isLoading: boolean;
  currentUrl?: string | null;
}

// System generated/preset banners
const PRESETS = [
    'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1614850523060-8da1d56ae167?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&q=80&w=600'
];

export const BannerSelectionModal: React.FC<BannerSelectionModalProps> = ({ isOpen, onClose, onSelect, isLoading, currentUrl }) => {
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
    <Modal isOpen={isOpen} onClose={onClose} title="Choose a Header Image">
      <div className="grid grid-cols-2 gap-4 mb-6">
         {PRESETS.map((url) => (
             <button
                key={url}
                onClick={() => setSelected(url)}
                className={`
                    relative aspect-video rounded-xl overflow-hidden border-2 transition-all
                    ${selected === url ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-gray-200'}
                `}
             >
                 <img src={url} alt="Banner option" className="w-full h-full object-cover" />
                 {selected === url && (
                     <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                         <div className="bg-white rounded-full p-1 shadow-sm">
                            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path d="M5 13l4 4L19 7" />
                            </svg>
                         </div>
                     </div>
                 )}
             </button>
         ))}
      </div>
      <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isLoading} className="w-auto">Cancel</Button>
          <Button onClick={handleConfirm} disabled={!selected || isLoading} isLoading={isLoading} className="w-auto">Save Banner</Button>
      </div>
    </Modal>
  );
};