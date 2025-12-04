
import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Trash2 } from 'lucide-react';

interface BannerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string | null) => void;
  isLoading: boolean;
  currentUrl?: string | null;
}

// Curated list of reliable Unsplash image IDs for backgrounds/gradients
const PRESETS = [
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=600', // Gradient
    'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=600', // Dark Gradient
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=600', // Liquid
    'https://images.unsplash.com/photo-1614850523060-8da1d56ae167?auto=format&fit=crop&q=80&w=600', // Neon
    'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=600', // Abstract
    'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?auto=format&fit=crop&q=80&w=600', // Geometric
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600', // Fluid
    'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&q=80&w=600', // Clean
    'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&q=80&w=600', // Minimal
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=600', // Nature Landscape
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600', // Mountains
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&q=80&w=600', // Green
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=600', // Foggy
    'https://images.unsplash.com/photo-1501854140884-074cf2b2c3af?auto=format&fit=crop&q=80&w=600', // Forest
    'https://images.unsplash.com/photo-1533038590317-7f1d87b21d33?auto=format&fit=crop&q=80&w=600', // Electric
    'https://images.unsplash.com/photo-1519681393798-3828fb4090bb?auto=format&fit=crop&q=80&w=600'  // City
];

export const BannerSelectionModal: React.FC<BannerSelectionModalProps> = ({ isOpen, onClose, onSelect, isLoading, currentUrl }) => {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
        setSelected(currentUrl || null);
    }
  }, [isOpen, currentUrl]);

  const handleConfirm = () => {
    onSelect(selected);
  };

  const handleRemove = () => {
      if (window.confirm("Are you sure you want to remove your header image?")) {
          onSelect(null);
      }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose a Header Image">
      <div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2">
        <div className="grid grid-cols-2 gap-4 mb-6">
            {PRESETS.map((url) => (
                <button
                    key={url}
                    onClick={() => setSelected(url)}
                    className={`
                        relative aspect-video rounded-xl overflow-hidden border-2 transition-all w-full
                        ${selected === url ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-gray-200'}
                    `}
                >
                    <img src={url} alt="Banner option" className="w-full h-full object-cover" loading="lazy" />
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
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4 pt-4 border-t border-gray-100">
          <button 
            type="button"
            onClick={handleRemove}
            className="text-red-500 text-sm font-medium hover:text-red-600 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors w-full sm:w-auto justify-center sm:justify-start"
            title="Remove Banner"
          >
              <Trash2 size={16} /> Remove
          </button>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="secondary" onClick={onClose} disabled={isLoading} className="flex-1 sm:w-auto px-4">Cancel</Button>
            <Button onClick={handleConfirm} isLoading={isLoading} className="flex-1 sm:w-auto px-6">Save</Button>
          </div>
      </div>
    </Modal>
  );
};
