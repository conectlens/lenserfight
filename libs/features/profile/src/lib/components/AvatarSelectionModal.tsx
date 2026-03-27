import { Trash2 } from 'lucide-react'
import React, { useState, useEffect } from 'react'

import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'

interface AvatarSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string | null) => void
  isLoading: boolean
  currentUrl?: string | null
}

const SEEDS = [
  'Felix',
  'Aneka',
  'Zack',
  'Sarah',
  'Buster',
  'Molly',
  'Pepper',
  'Willow',
  'Garfield',
  'Salem',
  'Luna',
  'Shadow',
  'Max',
  'Chloe',
  'Jack',
  'Bella',
  'Rocky',
  'Daisy',
  'Buddy',
  'Lily',
  'Charlie',
  'Lucy',
  'Cooper',
  'Coco',
  'Bear',
  'Sophie',
  'Teddy',
  'Sadie',
  'Duke',
  'Bailey',
]

const PRESETS = SEEDS.map((seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`)

export const AvatarSelectionModal: React.FC<AvatarSelectionModalProps> = ({
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
    if (window.confirm('Are you sure you want to remove your avatar?')) {
      onSelect(null)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Choose your Lenser"
      footer={
        <ModalFooter
          leftButton={{ label: <><Trash2 size={16} /> Remove</>, onClick: handleRemove, variant: 'danger' }}
          rightButtons={[{ label: 'Cancel', onClick: onClose, disabled: isLoading, variant: 'secondary' }]}
          primaryButton={{ label: 'Save', onClick: handleConfirm, isLoading }}
        />
      }
    >
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {PRESETS.map((url) => (
          <button
            key={url}
            onClick={() => setSelected(url)}
            className={`
                      relative aspect-square rounded-full overflow-hidden border-2 transition-all p-1 group
                      ${selected === url ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}
                  `}
          >
            <img
              src={url}
              alt="Avatar option"
              className="w-full h-full object-cover rounded-full bg-gray-50 dark:bg-gray-700"
            />
          </button>
        ))}
      </div>
    </Dialog>
  )
}
