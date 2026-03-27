import { Trash2 } from 'lucide-react'
import React, { useState, useEffect } from 'react'

import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'

interface BannerSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string | null) => void
  isLoading: boolean
  currentUrl?: string | null
}

const PRESETS = [
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1614850523060-8da1d56ae167?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1501854140884-074cf2b2c3af?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1533038590317-7f1d87b21d33?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1519681393798-3828fb4090bb?auto=format&fit=crop&q=80&w=600',
]

export const BannerSelectionModal: React.FC<BannerSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  isLoading,
  currentUrl,
}) => {
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setSelected(currentUrl || null)
    }
  }, [isOpen, currentUrl])

  const handleConfirm = () => {
    onSelect(selected)
  }

  const handleRemove = () => {
    if (window.confirm('Are you sure you want to remove your header image?')) {
      onSelect(null)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Choose a Header Image"
      footer={
        <ModalFooter
          leftButton={{ label: <><Trash2 size={16} /> Remove</>, onClick: handleRemove, variant: 'danger' }}
          rightButtons={[{ label: 'Cancel', onClick: onClose, disabled: isLoading, variant: 'secondary' }]}
          primaryButton={{ label: 'Save', onClick: handleConfirm, isLoading }}
        />
      }
    >
      <div className="grid grid-cols-2 gap-4">
        {PRESETS.map((url) => (
          <button
            key={url}
            onClick={() => setSelected(url)}
            className={`
                      relative aspect-video rounded-xl overflow-hidden border-2 transition-all w-full
                      ${selected === url ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}
                  `}
          >
            <img
              src={url}
              alt="Banner option"
              className="w-full h-full object-cover bg-gray-100 dark:bg-gray-800"
              loading="lazy"
            />
            {selected === url && (
              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                <div className="bg-white rounded-full p-1 shadow-sm">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </Dialog>
  )
}
