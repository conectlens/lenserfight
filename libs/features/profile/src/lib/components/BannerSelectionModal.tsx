import { createAvatar } from '@dicebear/core'
import { shapes } from '@dicebear/collection'
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

const BANNER_SEEDS = [
  'aurora',
  'nebula',
  'prism',
  'vortex',
  'zenith',
  'cobalt',
  'ember',
  'frost',
  'helix',
  'indigo',
  'jade',
  'krypton',
  'lumen',
  'mosaic',
  'onyx',
  'quasar',
]

const PRESETS = BANNER_SEEDS.map((seed) =>
  createAvatar(shapes, { seed, size: 400 }).toDataUri()
)

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
        {PRESETS.map((uri) => (
          <button
            key={uri}
            onClick={() => setSelected(uri)}
            className={`
                      relative aspect-video rounded-xl overflow-hidden border-2 transition-all w-full
                      ${selected === uri ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}
                  `}
          >
            <img
              src={uri}
              alt="Banner option"
              className="w-full h-full object-cover bg-gray-100 dark:bg-gray-800"
              loading="lazy"
            />
            {selected === uri && (
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
